package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.SoftOptInError
import io.circe.Encoder
import io.circe.generic.semiauto.deriveEncoder
import io.circe.syntax._
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.sqs.SqsClient
import software.amazon.awssdk.services.sqs.model.SendMessageRequest

import scala.util.Try

class SecondaryUserConsentPublisher(
    sendMessage: String => Either[SoftOptInError, Unit],
) {
  import SecondaryUserConsentPublisher._

  def sendCancellation(identityId: String, subscriptionId: String): Either[SoftOptInError, Unit] = {
    val message = SecondaryUserCancellationMessage(
      identityId = identityId,
      subscriptionId = subscriptionId,
    ).asJson.noSpaces

    sendMessage(message).left.map(error =>
      SoftOptInError(
        s"Failed to send secondary user cancellation for identity $identityId and subscription $subscriptionId",
        error,
      ),
    )
  }
}

object SecondaryUserConsentPublisher {
  private case class SecondaryUserCancellationMessage(
      identityId: String,
      subscriptionId: String,
      eventType: String = "Cancellation",
      productName: String = "SECONDARY_USER",
  )

  private implicit val secondaryUserCancellationMessageEncoder: Encoder[SecondaryUserCancellationMessage] =
    deriveEncoder

  def create(maybeQueueUrl: Option[String]): Either[SoftOptInError, SecondaryUserConsentPublisher] =
    for {
      queueUrl <- maybeQueueUrl.toRight(SoftOptInError("softOptInQueueUrl is missing"))
      credentials <- AwsCredentialsBuilder.buildCredentials
      sqsClient <- Try(
        SqsClient
          .builder()
          .region(Region.EU_WEST_1)
          .credentialsProvider(credentials)
          .build(),
      ).toEither.left.map(error => SoftOptInError("Failed to create SQS client", error))
    } yield new SecondaryUserConsentPublisher(payload =>
      Try(
        sqsClient.sendMessage(
          SendMessageRequest
            .builder()
            .queueUrl(queueUrl)
            .messageBody(payload)
            .build(),
        ),
      ).toEither.left
        .map(error => SoftOptInError("Failed to send message to soft opt-in queue", error))
        .map(_ => ()),
    )
}
