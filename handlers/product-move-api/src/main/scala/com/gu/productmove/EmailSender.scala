package com.gu.productmove

import com.gu.productmove.GuStageLive.Stage
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider
import software.amazon.awssdk.http.nio.netty.NettyNioAsyncHttpClient
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.sqs.SqsAsyncClient
import software.amazon.awssdk.services.sqs.model.{GetQueueUrlRequest, GetQueueUrlResponse, SendMessageRequest}
import zio.*
import zio.json.*

trait EmailSender {
  def sendEmail(message: EmailMessage): ZIO[Any, String, Unit]
}

object EmailSender {
  def sendEmail(message: EmailMessage): ZIO[EmailSender, String, Unit] = {
    ZIO.environmentWithZIO(_.get.sendEmail(message))
  }
}

object EmailSenderLive {

  val layer: ZLayer[AwsCredentialsProvider with Stage, String, EmailSender] =
    ZLayer.scoped(for {
    stage <- ZIO.service[Stage]
    sqsClient <- initializeSQSClient().mapError(ex => s"Failed to initialize SQS Client with error: $ex")
    queueUrlResponse <- getQueue(stage, sqsClient)
  } yield new EmailSender {
    override def sendEmail(message: EmailMessage): ZIO[Any, String, Unit] =
      sendMessage(sqsClient, queueUrlResponse.queueUrl, message)
  })

  private def initializeSQSClient(): ZIO[AwsCredentialsProvider with Scope, Throwable, SqsAsyncClient] =
      for {
        creds <- ZIO.service[AwsCredentialsProvider]
        sqsClient <- ZIO.fromAutoCloseable(ZIO.attempt(impl(creds)))
      } yield sqsClient

  private def getQueue(stage: Stage, sqsAsyncClient: SqsAsyncClient): ZIO[Any, String, GetQueueUrlResponse] =
    // choose existing SQS queue to test for now, create another queue for this.
    val queueName = if (stage == Stage.PROD) "contributions-thanks" else "contributions-thanks-dev"
    val queueUrl = GetQueueUrlRequest.builder.queueName(queueName).build()

    ZIO
      .fromCompletableFuture(
        sqsAsyncClient.getQueueUrl(queueUrl)
      ).mapError { ex => s"Failed to get sqs queue url: ${ex.getMessage}" }

  private def impl(creds: AwsCredentialsProvider): SqsAsyncClient =
    SqsAsyncClient.builder
      .region(Region.EU_WEST_1)
      .credentialsProvider(creds)
      .build()

  private def sendMessage(sqsClient: SqsAsyncClient, queueUrl: String, message: EmailMessage) =
    for {
      result <- ZIO
        .fromCompletableFuture {
          sqsClient.sendMessage(
            SendMessageRequest.builder
              .queueUrl(queueUrl)
              .messageBody(message.toJson)
              .build()
          )
        }
        .mapError { ex =>
          s"Failed to send sqs email message for sfContactId: ${message.SfContactId} with subscription Number: ${message.To.ContactAttributes.SubscriberAttributes.subscription_id}"
        }
      _ <- ZIO.log(
        s"Successfully sent email for sfContactId: ${message.SfContactId} with subscription Number: ${message.To.ContactAttributes.SubscriberAttributes.subscription_id}"
      )
    } yield ()
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
  IdentityUserId: Option[String]
)

given JsonEncoder[EmailPayloadSubscriberAttributes] = DeriveJsonEncoder.gen[EmailPayloadSubscriberAttributes]
given JsonEncoder[EmailPayloadContactAttributes] = DeriveJsonEncoder.gen[EmailPayloadContactAttributes]
given JsonEncoder[EmailPayload] = DeriveJsonEncoder.gen[EmailPayload]
given JsonEncoder[EmailMessage] = DeriveJsonEncoder.gen[EmailMessage]

