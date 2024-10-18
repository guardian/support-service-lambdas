package com.gu.productmove

import com.gu.effects.sqs.AwsSQSSend.EmailQueueName
import com.gu.newproduct.api.productcatalog.BillingPeriod
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.available.Currency
import com.gu.productmove.refund.RefundInput
import com.gu.productmove.salesforce.Salesforce.SalesforceRecordInput
import com.gu.productmove.zuora.GetAccount.{BillToContact, GetAccountResponse}
import org.joda.time.format.DateTimeFormat
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider
import software.amazon.awssdk.http.nio.netty.NettyNioAsyncHttpClient
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.sqs.{SqsAsyncClient, SqsClient}
import software.amazon.awssdk.services.sqs.model.{GetQueueUrlRequest, GetQueueUrlResponse, SendMessageRequest}
import zio.*
import zio.json.*
import zio.json.internal.Write

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import scala.util.Try

trait SQS {
  def sendEmail(message: EmailMessage): Task[Unit]

  def queueRefund(refundInput: RefundInput): Task[Unit]

  def queueSalesforceTracking(salesforceRecordInput: SalesforceRecordInput): Task[Unit]
}

object SQS {
  def sendEmail(message: EmailMessage): RIO[SQS, Unit] = {
    ZIO.environmentWithZIO(_.get.sendEmail(message))
  }

  def queueRefund(refundInput: RefundInput): RIO[SQS, Unit] = {
    ZIO.environmentWithZIO(_.get.queueRefund(refundInput))
  }

  def queueSalesforceTracking(salesforceRecordInput: SalesforceRecordInput): RIO[SQS, Unit] = {
    ZIO.environmentWithZIO(_.get.queueSalesforceTracking(salesforceRecordInput))
  }
}

class SQSLive(
    sqsClient: SqsClient,
    emailQueueUrl: String,
    refundQueueUrl: String,
    salesforceTrackingQueueUrl: String,
) extends SQS {

  override def sendEmail(message: EmailMessage): Task[Unit] =
    for {
      _ <- ZIO
        .attemptBlocking {
          sqsClient.sendMessage(
            SendMessageRequest.builder
              .queueUrl(emailQueueUrl)
              .messageBody(message.toJson)
              .build(),
          )
        }
        .mapError { ex =>
          message.To.ContactAttributes.SubscriberAttributes match {
            case attributes: RCtoSPEmailPayloadProductSwitchAttributes =>
              new Throwable(
                s"Failed to send product switch email message to SQS for sfContactId: ${message.SfContactId} with subscription Number: ${attributes.subscription_id} with error: ${ex.toString} to SQS queue $emailQueueUrl",
                ex,
              )
            case attributes: toRCEmailPayloadProductSwitchAttributes =>
              new Throwable(
                s"Failed to send product switch email message to SQS for sfContactId: ${message.SfContactId} with subscription Number: ${attributes.subscription_id} with error: ${ex.toString} to SQS queue $emailQueueUrl",
                ex,
              )
            case _: EmailPayloadCancellationAttributes =>
              new Throwable(
                s"Failed to send subscription cancellation email message to SQS for sfContactId: ${message.SfContactId} with error: ${ex.toString} to SQS queue $emailQueueUrl",
                ex,
              )
            case _: EmailPayloadUpdateAmountAttributes =>
              new Throwable(
                s"Failed to send update amount email message to SQS for sfContactId: ${message.SfContactId} with error: ${ex.toString} to SQS queue $emailQueueUrl",
                ex,
              )
          }
        }
      _ <- ZIO.log(
        message.To.ContactAttributes.SubscriberAttributes match {
          case attributes: RCtoSPEmailPayloadProductSwitchAttributes =>
            s"Successfully sent product switch email for sfContactId: ${message.SfContactId} with subscription Number: ${attributes.subscription_id} to SQS queue $emailQueueUrl"
          case attributes: toRCEmailPayloadProductSwitchAttributes =>
            s"Successfully sent product switch email for sfContactId: ${message.SfContactId} with subscription Number: ${attributes.subscription_id} to SQS queue $emailQueueUrl"
          case _: EmailPayloadCancellationAttributes =>
            s"Successfully sent subscription cancellation email for sfContactId: ${message.SfContactId} to SQS queue $emailQueueUrl"
          case _: EmailPayloadUpdateAmountAttributes =>
            s"Successfully sent update amount email for sfContactId: ${message.SfContactId} to SQS queue $emailQueueUrl"
        },
      )
    } yield ()

  override def queueRefund(refundInput: RefundInput): Task[Unit] =
    for {
      _ <- ZIO
        .attemptBlocking {
          sqsClient.sendMessage(
            SendMessageRequest.builder
              .queueUrl(refundQueueUrl)
              .messageBody(refundInput.toJson)
              .build(),
          )
        }
        .mapError { ex =>
          new Throwable(
            s"Failed to send sqs refund message with subscription Number: ${refundInput.subscriptionName} with error: ${ex.toString}",
            ex,
          )
        }
      _ <- ZIO.log(
        s"Successfully sent refund message for subscription number: ${refundInput.subscriptionName}",
      )
    } yield ()

  override def queueSalesforceTracking(
      salesforceRecordInput: SalesforceRecordInput,
  ): Task[Unit] =
    for {
      _ <- ZIO
        .attemptBlocking {
          sqsClient.sendMessage(
            SendMessageRequest.builder
              .queueUrl(salesforceTrackingQueueUrl)
              .messageBody(salesforceRecordInput.toJson)
              .build(),
          )
        }
        .mapError { ex =>
          new Throwable(
            s"Failed to send sqs salesforce tracking message with subscription Number: ${salesforceRecordInput.subscriptionName} with error: ${ex.toString}",
            ex,
          )
        }
      _ <- ZIO.log(
        s"Successfully sent salesforce tracking message for subscription number: ${salesforceRecordInput.subscriptionName}",
      )
    } yield ()

}

object SQSLive {
  val layer: RLayer[AwsCredentialsProvider & Stage, SQS] =
    ZLayer.scoped(for {
      stage <- ZIO.service[Stage]
      creds <- ZIO.service[AwsCredentialsProvider]
      sqsLive <- ZIO.fromTry(impl(stage, creds))
    } yield sqsLive)

  def impl(stage: Stage, creds: AwsCredentialsProvider): Try[SQSLive] = {
    for {
      sqsClient <- impl(creds).toEither.left
        .map(ex => new Throwable(s"Failed to initialize SQS Client with error", ex))
        .toTry
      emailQueueUrlResponse <- getQueue(EmailQueueName.value, sqsClient)
      refundQueueUrlResponse <- getQueue(s"product-switch-refund-${stage.toString}", sqsClient)
      salesforceTrackingQueueUrlResponse <- getQueue(s"product-switch-salesforce-tracking-${stage.toString}", sqsClient)
    } yield new SQSLive(
      sqsClient,
      emailQueueUrlResponse.queueUrl(),
      refundQueueUrlResponse.queueUrl(),
      salesforceTrackingQueueUrlResponse.queueUrl(),
    )
  }

  private def getQueue(
      queueName: String,
      sqsClient: SqsClient,
  ): Try[GetQueueUrlResponse] = {
    val queueUrl = GetQueueUrlRequest.builder.queueName(queueName).build()

    Try(
      sqsClient.getQueueUrl(queueUrl),
    ).toEither.left.map { ex => new Throwable(s"Failed to get sqs queue name: $queueName", ex) }.toTry
  }

  private def impl(creds: AwsCredentialsProvider): Try[SqsClient] =
    Try(
      SqsClient.builder
        .region(Region.EU_WEST_1)
        .credentialsProvider(creds)
        .build(),
    )
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
    derives JsonEncoder

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
    derives JsonEncoder

case class EmailPayloadCancellationAttributes(
    first_name: String,
    last_name: String,
    product_type: String,
    cancellation_effective_date: Option[String],
) extends EmailPayloadAttributes
    derives JsonEncoder

case class EmailPayloadUpdateAmountAttributes(
    first_name: String,
    last_name: String,
    new_amount: String,
    currency: String,
    frequency: String,
    next_payment_date: String,
) extends EmailPayloadAttributes
    derives JsonEncoder

case class EmailPayloadContactAttributes(SubscriberAttributes: EmailPayloadAttributes) derives JsonEncoder

case class EmailPayload(Address: Option[String], ContactAttributes: EmailPayloadContactAttributes) derives JsonEncoder

case class EmailMessage(
    To: EmailPayload,
    DataExtensionName: String,
    SfContactId: String,
    IdentityUserId: Option[IdentityId],
) derives JsonEncoder

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

given JsonEncoder[EmailPayloadAttributes] =
  (attributes: EmailPayloadAttributes, indent: Option[RuntimeFlags], out: Write) =>
    attributes match {
      case attributes: RCtoSPEmailPayloadProductSwitchAttributes =>
        summon[JsonEncoder[RCtoSPEmailPayloadProductSwitchAttributes]].unsafeEncode(attributes, indent, out)
      case attributes: toRCEmailPayloadProductSwitchAttributes =>
        summon[JsonEncoder[toRCEmailPayloadProductSwitchAttributes]].unsafeEncode(attributes, indent, out)
      case attributes: EmailPayloadCancellationAttributes =>
        summon[JsonEncoder[EmailPayloadCancellationAttributes]].unsafeEncode(attributes, indent, out)
      case attributes: EmailPayloadUpdateAmountAttributes =>
        summon[JsonEncoder[EmailPayloadUpdateAmountAttributes]].unsafeEncode(attributes, indent, out)
    }

given JsonEncoder[IdentityId] = JsonEncoder[String].contramap(_.rawIdentityId)
