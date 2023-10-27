package com.gu.singleContributionSalesforceWrites.handlers

import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.gu.singleContributionSalesforceWrites.models.{AwsSecretsManagerError, JsonDecodeError, HttpRequestError}
import com.gu.singleContributionSalesforceWrites.services._
import com.gu.singleContributionSalesforceWrites.services.salesforce.CreateSingleContributionRecord
import com.gu.util.Logging
import io.circe.generic.auto.exportDecoder

case class PaymentApiMessageDetail(
    amount: Double,
    contributionId: String,
    country: String,
    currency: String,
    eventTimeStamp: String,
    identityId: String,
    paymentId: String,
    paymentProvider: String,
    postalCode: Option[String],
    state: Option[String],
    email: String,
)

case class PaymentApiMessage(
    id: String,
    source: String,
    detail: PaymentApiMessageDetail,
)

object CreateSalesforceSingleContributionRecordHandler extends RequestHandler[SQSEvent, Unit] with Logging {

  override def handleRequest(event: SQSEvent, context: Context): Unit = {
    event match {
      case sqsEvent: SQSEvent =>
        sqsEvent.getRecords.forEach { sqsRecord =>
          logger.info(s"Processing message: ${sqsRecord.getBody}")

          JsonDecoder.decodeJson[PaymentApiMessage](sqsRecord.getBody) match {
            case Right(message) => {
              processMessage(message.detail)
            }
            case Left(error: JsonDecodeError) =>
              throw new RuntimeException(s"JSON decode error: ${error.message}")
          }
        }
      case _ =>
        throw new RuntimeException("Received an unexpected event type")
    }
  }

  def processMessage(contribution: PaymentApiMessageDetail): Unit = {
    val stage = sys.env.getOrElse("STAGE", "CODE")

    val result = for {
      accessToken <- GetAccessToken(stage)
      response <- CreateSingleContributionRecord(stage, accessToken, contribution)
    } yield response

    result match {
      case Right(_) => ()
      case Left(error: JsonDecodeError) => throw new RuntimeException(s"JSON decode error: ${error.message}")
      case Left(error: HttpRequestError) => throw new RuntimeException(s"HTTP request error: ${error.message}")
      case Left(error: AwsSecretsManagerError) =>
        throw new RuntimeException(s"AWS secrets manager error: ${error.message}")
    }
  }
}
