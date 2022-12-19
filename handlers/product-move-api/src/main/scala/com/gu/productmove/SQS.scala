package com.gu.productmove

import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.refund.RefundInput
import com.gu.productmove.salesforce.SalesforceHandler.SalesforceRecordInput
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider
import software.amazon.awssdk.http.nio.netty.NettyNioAsyncHttpClient
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.sqs.SqsAsyncClient
import software.amazon.awssdk.services.sqs.model.{GetQueueUrlRequest, GetQueueUrlResponse, SendMessageRequest}
import zio.*
import zio.json.*

trait SQS {
  def sendEmail(message: EmailMessage): ZIO[Any, String, Unit]

  def queueRefund(refundInput: RefundInput): ZIO[Any, String, Unit]

  def queueSalesforceTracking(salesforceRecordInput: SalesforceRecordInput): ZIO[Any, String, Unit]
}

object SQS {
  def sendEmail(message: EmailMessage): ZIO[SQS, String, Unit] = {
    ZIO.environmentWithZIO(_.get.sendEmail(message))
  }

  def queueRefund(refundInput: RefundInput): ZIO[SQS, String, Unit] = {
    ZIO.environmentWithZIO(_.get.queueRefund(refundInput))
  }

  def queueSalesforceTracking(salesforceRecordInput: SalesforceRecordInput): ZIO[SQS, String, Unit] = {
    ZIO.environmentWithZIO(_.get.queueSalesforceTracking(salesforceRecordInput))
  }
}

object SQSLive {
  val layer: ZLayer[AwsCredentialsProvider with Stage, String, SQS] =
    ZLayer.scoped(for {
      stage <- ZIO.service[Stage]
      sqsClient <- initializeSQSClient().mapError(ex => s"Failed to initialize SQS Client with error: $ex")
      emailQueueUrlResponse <- getQueue(if (stage == Stage.PROD) "contributions-thanks" else "contributions-thanks-dev", sqsClient)
      refundQueueUrlResponse <- getQueue(s"product-switch-refund-${stage.toString}", sqsClient)
      salesforceTrackingQueueUrlResponse <- getQueue(s"product-switch-salesforce-tracking-${stage.toString}", sqsClient)
    } yield new SQS {
      override def sendEmail(message: EmailMessage): ZIO[Any, String, Unit] =
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
              s"Failed to send sqs email message for sfContactId: ${message.SfContactId} with subscription Number: ${message.To.ContactAttributes.SubscriberAttributes.subscription_id} with error: ${ex.toString}"
            }
          _ <- ZIO.log(
            s"Successfully sent email for sfContactId: ${message.SfContactId} with subscription Number: ${message.To.ContactAttributes.SubscriberAttributes.subscription_id}",
          )
        } yield ()

      override def queueRefund(refundInput: RefundInput): ZIO[Any, String, Unit] =
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
              s"Failed to send sqs refund message with subscription Number: ${refundInput.subscriptionName} with error: ${ex.toString}"
            }
          _ <- ZIO.log(
            s"Successfully sent refund message for subscription number: ${refundInput.subscriptionName}",
          )
        } yield ()

      override def queueSalesforceTracking(salesforceRecordInput: SalesforceRecordInput): ZIO[Any, String, Unit] =
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
              s"Failed to send sqs salesforce tracking message with subscription Number: ${salesforceRecordInput.subscriptionName} with error: ${ex.toString}"
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

  private def getQueue(queueName: String, sqsAsyncClient: SqsAsyncClient): ZIO[Any, String, GetQueueUrlResponse] =
    val queueUrl = GetQueueUrlRequest.builder.queueName(queueName).build()

    ZIO
      .fromCompletableFuture(
        sqsAsyncClient.getQueueUrl(queueUrl),
      )
      .mapError { ex => s"Failed to get sqs queue url: ${ex.getMessage}" }

  private def impl(creds: AwsCredentialsProvider): SqsAsyncClient =
    SqsAsyncClient.builder
      .region(Region.EU_WEST_1)
      .credentialsProvider(creds)
      .build()
}

case class EmailPayloadSubscriberAttributes(
    first_name: String,
    last_name: String,
    first_payment_amount: String,
    date_of_first_payment: String,
    price: String,
    payment_frequency: String,
    contribution_cancellation_date: String,
    currency: String,
    subscription_id: String,
)

case class EmailPayloadContactAttributes(SubscriberAttributes: EmailPayloadSubscriberAttributes)

case class EmailPayload(Address: Option[String], ContactAttributes: EmailPayloadContactAttributes)

case class EmailMessage(
    To: EmailPayload,
    DataExtensionName: String,
    SfContactId: String,
    IdentityUserId: Option[String],
)

given JsonEncoder[EmailPayloadSubscriberAttributes] = DeriveJsonEncoder.gen[EmailPayloadSubscriberAttributes]
given JsonEncoder[EmailPayloadContactAttributes] = DeriveJsonEncoder.gen[EmailPayloadContactAttributes]
given JsonEncoder[EmailPayload] = DeriveJsonEncoder.gen[EmailPayload]
given JsonEncoder[EmailMessage] = DeriveJsonEncoder.gen[EmailMessage]
