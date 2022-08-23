package com.gu.productmove

import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.sqs.SqsAsyncClient
import software.amazon.awssdk.services.sqs.model.{GetQueueUrlRequest, SendMessageRequest}
import zio.*
import zio.json.{DeriveJsonDecoder, JsonDecoder}

trait EmailSender {
  def sendEmail(message: EmailMessage): ZIO[Any, String, Unit]
}

object EmailSender {
  def sendEmail(message: EmailMessage): ZIO[EmailSender, String, Unit] = {
    ZIO.environmentWithZIO(_.get.sendEmail(message))
  }
}

object EmailSenderLive {

  val layer: ZLayer[AwsCredentialsProvider, Throwable, EmailSender] =
    ZLayer.scoped(
      for {
        creds <- ZIO.service[AwsCredentialsProvider]
        sqsClient <- ZIO.fromAutoCloseable(ZIO.attempt(impl(creds)))
        queueUrlResponse <- ZIO
          .fromCompletableFuture(
            sqsClient.getQueueUrl(GetQueueUrlRequest.builder.queueName(config.sqsEmailQueueName).build())
          )
          .mapError { ex => s"Failed to get sqs queue url: ${ex.getMessage}" }
      } yield new EmailSender {
        override def sendEmail(message: EmailMessage): Task[String] =
          sendMessage(sqsClient, queueUrlResponse.queueUrl, message)
      }
    )

  private def impl(creds: AwsCredentialsProvider): SqsAsyncClient =
    SqsAsyncClient.builder()
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
          s"Failed to send sqs email message for sfContactId ${message.SfContactId}: ${ex.getMessage}"
        }
      _ <- ZIO.log(
        s"Successfully sent email for sfContactId ${message.SfContactId} message id: ${result.messageId}"
      )
    } yield ()
}

case class EmailPayloadSubscriberAttributes(
  title: Option[String],
  first_name: String,
  last_name: String,
  billing_address_1: String,
  billing_address_2: Option[String],
  billing_city: Option[String],
  billing_postal_code: String,
  billing_state: Option[String],
  billing_country: String,
  payment_amount: String,
  next_payment_date: String,
  payment_frequency: String,
  subscription_id: String,
  product_type: String
)

case class EmailPayloadContactAttributes(SubscriberAttributes: EmailPayloadSubscriberAttributes)

case class EmailPayload(Address: Option[String], ContactAttributes: EmailPayloadContactAttributes)

case class EmailMessage(
  To: EmailPayload,
  DataExtensionName: String,
  SfContactId: String,
  IdentityUserId: Option[String]
)

given JsonDecoder[EmailPayloadSubscriberAttributes] = DeriveJsonDecoder.gen[EmailPayloadSubscriberAttributes]
given JsonDecoder[EmailPayloadContactAttributes] = DeriveJsonDecoder.gen[EmailPayloadContactAttributes]
given JsonDecoder[EmailPayload] = DeriveJsonDecoder.gen[EmailPayload]
given JsonDecoder[EmailMessage] = DeriveJsonDecoder.gen[EmailMessage]

