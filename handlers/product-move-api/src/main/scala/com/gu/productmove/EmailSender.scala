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
    val queueName = if (stage == Stage.PROD) "direct-mail-PROD" else "direct-mail-CODE"
    val queueUrl = GetQueueUrlRequest.builder.queueName(queueName).build()

    println(sqsAsyncClient.listQueues())

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
          s"Failed to send sqs email message for sfContactId"
        }
      _ <- ZIO.log(
        s"Successfully sent email for sfContactId"
      )
    } yield ()
}

case class EmailPayloadSubscriberAttributes(
  first_name: String,
  last_name: String,
  first_payment_amount: String,
  date_of_first_payment: String,
  payment_frequency: String,
  contribution_cancellation_date: String,
  currency: String,
  promotion: String,
  subscription_id: String,
)

case class EmailPayloadContactAttributes(SubscriberAttributes: EmailPayloadSubscriberAttributes)

case class EmailPayload(Address: Option[String], ContactAttributes: EmailPayloadContactAttributes)

case class EmailMessage(
  To: EmailPayload,
  DataExtensionName: String,
)

given JsonEncoder[EmailPayloadSubscriberAttributes] = DeriveJsonEncoder.gen[EmailPayloadSubscriberAttributes]
given JsonEncoder[EmailPayloadContactAttributes] = DeriveJsonEncoder.gen[EmailPayloadContactAttributes]
given JsonEncoder[EmailPayload] = DeriveJsonEncoder.gen[EmailPayload]
given JsonEncoder[EmailMessage] = DeriveJsonEncoder.gen[EmailMessage]

