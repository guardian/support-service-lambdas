package com.gu.productmove

import com.gu.effects.sqs.AwsSQSSend.EmailQueueName
import com.gu.newproduct.api.productcatalog.BillingPeriod
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.available.Currency
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
import com.gu.productmove.refund.RefundInput
import com.gu.productmove.salesforce.Salesforce.SalesforceRecordInput
import com.gu.productmove.zuora.GetAccount.{BillToContact, GetAccountResponse}
import org.joda.time.format.DateTimeFormat
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider
import software.amazon.awssdk.http.nio.netty.NettyNioAsyncHttpClient
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.sqs.SqsAsyncClient
import software.amazon.awssdk.services.sqs.model.{GetQueueUrlRequest, GetQueueUrlResponse, SendMessageRequest}
import zio.*
import zio.json.*
import zio.json.internal.Write

import java.time.LocalDate
import java.time.format.DateTimeFormatter

trait SQS {
  def sendEmail(message: EmailMessage): ZIO[Any, ErrorResponse, Unit]

  def queueRefund(refundInput: RefundInput): ZIO[Any, ErrorResponse, Unit]

  def queueSalesforceTracking(salesforceRecordInput: SalesforceRecordInput): ZIO[Any, ErrorResponse, Unit]
}

object SQS {
  def sendEmail(message: EmailMessage): ZIO[SQS, ErrorResponse, Unit] = {
    ZIO.environmentWithZIO(_.get.sendEmail(message))
  }

  def queueRefund(refundInput: RefundInput): ZIO[SQS, ErrorResponse, Unit] = {
    ZIO.environmentWithZIO(_.get.queueRefund(refundInput))
  }

  def queueSalesforceTracking(salesforceRecordInput: SalesforceRecordInput): ZIO[SQS, ErrorResponse, Unit] = {
    ZIO.environmentWithZIO(_.get.queueSalesforceTracking(salesforceRecordInput))
  }
}

object SQSLive {
  val layer: RLayer[AwsCredentialsProvider & Stage, SQS] =
    ZLayer.scoped(for {
      stage <- ZIO.service[Stage]
      sqsClient <- initializeSQSClient().mapError(ex =>
        new Throwable(s"Failed to initialize SQS Client with error", ex),
      )
      emailQueueName = EmailQueueName.value
      emailQueueUrlResponse <- getQueue(emailQueueName, sqsClient)
      refundQueueUrlResponse <- getQueue(s"product-switch-refund-${stage.toString}", sqsClient)
      salesforceTrackingQueueUrlResponse <- getQueue(s"product-switch-salesforce-tracking-${stage.toString}", sqsClient)
    } yield new SQS {
      override def sendEmail(message: EmailMessage): ZIO[Any, ErrorResponse, Unit] =
        for {
          _ <- ZIO
            .fromCompletableFuture {
              sqsClient.sendMessage(
                SendMessageRequest.builder
                  .queueUrl(emailQueueUrlResponse.queueUrl)
                  .messageBody(message.toJson)
                  .build(),
              )
            }
            .mapError { ex =>
              message.To.ContactAttributes.SubscriberAttributes match {
                case attributes: RCtoSPEmailPayloadProductSwitchAttributes =>
                  InternalServerError(
                    s"Failed to send product switch email message to SQS for sfContactId: ${message.SfContactId} with subscription Number: ${attributes.subscription_id} with error: ${ex.toString} to SQS queue $emailQueueName",
                  )
                case attributes: toRCEmailPayloadProductSwitchAttributes =>
                  InternalServerError(
                    s"Failed to send product switch email message to SQS for sfContactId: ${message.SfContactId} with subscription Number: ${attributes.subscription_id} with error: ${ex.toString} to SQS queue $emailQueueName",
                  )
                case _: EmailPayloadCancellationAttributes =>
                  InternalServerError(
                    s"Failed to send subscription cancellation email message to SQS for sfContactId: ${message.SfContactId} with error: ${ex.toString} to SQS queue $emailQueueName",
                  )
                case _: EmailPayloadUpdateAmountAttributes =>
                  InternalServerError(
                    s"Failed to send update amount email message to SQS for sfContactId: ${message.SfContactId} with error: ${ex.toString} to SQS queue $emailQueueName",
                  )
              }
            }
          _ <- ZIO.log(
            message.To.ContactAttributes.SubscriberAttributes match {
              case attributes: RCtoSPEmailPayloadProductSwitchAttributes =>
                s"Successfully sent product switch email for sfContactId: ${message.SfContactId} with subscription Number: ${attributes.subscription_id} to SQS queue $emailQueueName"
              case attributes: toRCEmailPayloadProductSwitchAttributes =>
                s"Successfully sent product switch email for sfContactId: ${message.SfContactId} with subscription Number: ${attributes.subscription_id} to SQS queue $emailQueueName"
              case _: EmailPayloadCancellationAttributes =>
                s"Successfully sent subscription cancellation email for sfContactId: ${message.SfContactId} to SQS queue $emailQueueName"
              case _: EmailPayloadUpdateAmountAttributes =>
                s"Successfully sent update amount email for sfContactId: ${message.SfContactId} to SQS queue $emailQueueName"
            },
          )
        } yield ()

      override def queueRefund(refundInput: RefundInput): ZIO[Any, ErrorResponse, Unit] =
        for {
          _ <- ZIO
            .fromCompletableFuture {
              sqsClient.sendMessage(
                SendMessageRequest.builder
                  .queueUrl(refundQueueUrlResponse.queueUrl)
                  .messageBody(refundInput.toJson)
                  .build(),
              )
            }
            .mapError { ex =>
              InternalServerError(
                s"Failed to send sqs refund message with subscription Number: ${refundInput.subscriptionName} with error: ${ex.toString}",
              )
            }
          _ <- ZIO.log(
            s"Successfully sent refund message for subscription number: ${refundInput.subscriptionName}",
          )
        } yield ()

      override def queueSalesforceTracking(
          salesforceRecordInput: SalesforceRecordInput,
      ): ZIO[Any, ErrorResponse, Unit] =
        for {
          _ <- ZIO
            .fromCompletableFuture {
              sqsClient.sendMessage(
                SendMessageRequest.builder
                  .queueUrl(salesforceTrackingQueueUrlResponse.queueUrl)
                  .messageBody(salesforceRecordInput.toJson)
                  .build(),
              )
            }
            .mapError { ex =>
              InternalServerError(
                s"Failed to send sqs salesforce tracking message with subscription Number: ${salesforceRecordInput.subscriptionName} with error: ${ex.toString}",
              )
            }
          _ <- ZIO.log(
            s"Successfully sent salesforce tracking message for subscription number: ${salesforceRecordInput.subscriptionName}",
          )
        } yield ()
    })

  private def initializeSQSClient(): ZIO[AwsCredentialsProvider with Scope, Throwable, SqsAsyncClient] =
    for {
      creds <- ZIO.service[AwsCredentialsProvider]
      sqsClient <- ZIO.fromAutoCloseable(ZIO.attempt(impl(creds)))
    } yield sqsClient

  private def getQueue(
      queueName: String,
      sqsAsyncClient: SqsAsyncClient,
  ): Task[GetQueueUrlResponse] =
    val queueUrl = GetQueueUrlRequest.builder.queueName(queueName).build()

    ZIO
      .fromCompletableFuture(
        sqsAsyncClient.getQueueUrl(queueUrl),
      )
      .mapError { ex => new Throwable(s"Failed to get sqs queue name: $queueName", ex) }

  private def impl(creds: AwsCredentialsProvider): SqsAsyncClient =
    SqsAsyncClient.builder
      .region(Region.EU_WEST_1)
      .credentialsProvider(creds)
      .build()
}

sealed trait EmailPayloadAttributes

case class toRCEmailPayloadProductSwitchAttributes(
    first_name: String,
    last_name: String,
    start_date: String,
    price: String,
    payment_frequency: String,
    currency: String,
    subscription_id: String,
) extends EmailPayloadAttributes

case class RCtoSPEmailPayloadProductSwitchAttributes(
    first_name: String,
    last_name: String,
    first_payment_amount: String,
    date_of_first_payment: String,
    price: String,
    payment_frequency: String,
    currency: String,
    subscription_id: String,
) extends EmailPayloadAttributes

case class EmailPayloadCancellationAttributes(
    first_name: String,
    last_name: String,
    product_type: String,
    cancellation_effective_date: Option[String],
) extends EmailPayloadAttributes

case class EmailPayloadUpdateAmountAttributes(
    first_name: String,
    last_name: String,
    new_amount: String,
    currency: String,
    frequency: String,
    next_payment_date: String,
) extends EmailPayloadAttributes

case class EmailPayloadContactAttributes(SubscriberAttributes: EmailPayloadAttributes)

case class EmailPayload(Address: Option[String], ContactAttributes: EmailPayloadContactAttributes)

case class EmailMessage(
    To: EmailPayload,
    DataExtensionName: String,
    SfContactId: String,
    IdentityUserId: Option[String],
)

object EmailMessage {
  private val emailDateFormat = DateTimeFormatter.ofPattern("d MMMM yyyy")

  def cancellationEmail(account: GetAccountResponse, cancellationDate: LocalDate) = {
    val contact = account.billToContact
    EmailMessage(
      EmailPayload(
        Address = Some(contact.workEmail),
        ContactAttributes = EmailPayloadContactAttributes(
          SubscriberAttributes = EmailPayloadCancellationAttributes(
            first_name = contact.firstName,
            last_name = contact.lastName,
            product_type = "Supporter Plus",
            cancellation_effective_date = Some(emailDateFormat.format(cancellationDate)),
          ),
        ),
      ),
      DataExtensionName = "subscription-cancelled-email",
      SfContactId = account.basicInfo.sfContactId__c,
      IdentityUserId = account.basicInfo.IdentityId__c,
    )
  }

  def updateAmountEmail(
      account: GetAccountResponse,
      newPrice: BigDecimal,
      currency: Currency,
      billingPeriod: String,
      nextPaymentDate: LocalDate,
  ) = {
    val contact = account.billToContact
    EmailMessage(
      EmailPayload(
        Address = Some(contact.workEmail),
        ContactAttributes = EmailPayloadContactAttributes(
          SubscriberAttributes = EmailPayloadUpdateAmountAttributes(
            first_name = contact.firstName,
            last_name = contact.lastName,
            new_amount = newPrice.setScale(2, BigDecimal.RoundingMode.FLOOR).toString,
            currency = currency.symbol,
            frequency = billingPeriod,
            next_payment_date = emailDateFormat.format(nextPaymentDate),
          ),
        ),
      ),
      DataExtensionName = "payment-amount-changed-email",
      SfContactId = account.basicInfo.sfContactId__c,
      IdentityUserId = account.basicInfo.IdentityId__c,
    )
  }
}

given JsonEncoder[RCtoSPEmailPayloadProductSwitchAttributes] =
  DeriveJsonEncoder.gen[RCtoSPEmailPayloadProductSwitchAttributes]
given JsonEncoder[toRCEmailPayloadProductSwitchAttributes] =
  DeriveJsonEncoder.gen[toRCEmailPayloadProductSwitchAttributes]
given JsonEncoder[EmailPayloadCancellationAttributes] = DeriveJsonEncoder.gen[EmailPayloadCancellationAttributes]

given JsonEncoder[EmailPayloadUpdateAmountAttributes] = DeriveJsonEncoder.gen[EmailPayloadUpdateAmountAttributes]
given JsonEncoder[EmailPayloadAttributes] =
  (attributes: EmailPayloadAttributes, indent: Option[RuntimeFlags], out: Write) =>
    attributes match {
      case attributes: RCtoSPEmailPayloadProductSwitchAttributes =>
        implicitly[JsonEncoder[RCtoSPEmailPayloadProductSwitchAttributes]].unsafeEncode(attributes, indent, out)
      case attributes: toRCEmailPayloadProductSwitchAttributes =>
        implicitly[JsonEncoder[toRCEmailPayloadProductSwitchAttributes]].unsafeEncode(attributes, indent, out)
      case attributes: EmailPayloadCancellationAttributes =>
        implicitly[JsonEncoder[EmailPayloadCancellationAttributes]].unsafeEncode(attributes, indent, out)
      case attributes: EmailPayloadUpdateAmountAttributes =>
        implicitly[JsonEncoder[EmailPayloadUpdateAmountAttributes]].unsafeEncode(attributes, indent, out)
    }
given JsonEncoder[EmailPayloadContactAttributes] = DeriveJsonEncoder.gen[EmailPayloadContactAttributes]
given JsonEncoder[EmailPayload] = DeriveJsonEncoder.gen[EmailPayload]
given JsonEncoder[EmailMessage] = DeriveJsonEncoder.gen[EmailMessage]
