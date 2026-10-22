package com.gu.autoCancel

import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.gu.effects.{GetFromS3, GetFromSecretsManager, Http, RawEffects}
import com.gu.util.Logging
import com.gu.util.TypeConvert._
import com.gu.util.apigateway.ApiGatewayResponse.unauthorized
import com.gu.util.apigateway.Auth
import com.gu.util.apigateway.Auth.TrustedApiConfig
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.email.{EmailSender, EmailSendSteps}
import com.gu.util.reader.Types._
import com.gu.util.zuora._
import okhttp3.{Request, Response}
import play.api.libs.json.{Json, Reads}

import java.time.LocalDate
import scala.jdk.CollectionConverters._
import scala.util.{Failure, Try}

/** Represents the message format from ApiGatewayToSqs */
case class ApiGatewayToSqsMessage(
    queryStringParameters: Map[String, String],
    body: String,
)

object ApiGatewayToSqsMessage {
  implicit val reads: Reads[ApiGatewayToSqsMessage] = Json.reads[ApiGatewayToSqsMessage]
}

/** Processes auto-cancel requests from SQS. Triggered by an EventSourceMapping with maxConcurrency: 5 to avoid Zuora
  * rate limits.
  *
  * Messages come from ApiGatewayToSqs which wraps the HTTP request in a JSON envelope with queryStringParameters
  * (including apiToken) and body (the AutoCancelCallout JSON).
  */
class AutoCancelSqsHandler(
    trustedConfig: => TrustedApiConfig,
    tokenProvider: => GetAccessToken,
    emailService: => EmailSender,
    dateProvider: Today,
    response: Request => Response,
    stage: Stage,
) extends RequestHandler[SQSEvent, Unit]
    with Logging {

  // main entry point from AWS lambda
  override def handleRequest(event: SQSEvent, context: Context): Unit = {
    val records = event.getRecords.asScala.toList
    logger.info(s"Processing ${records.size} SQS message(s)")

    val results = records.map(record =>
      for {
        (callout, apiToken) <- parseRecord(record)
        result <- Try(processCallout(callout, apiToken))
        _ <- result.toTry(())
      } yield (),
    )
    val failures = results.collect { case Failure(error) => error }
    if (failures.nonEmpty) {
      logger.error(s"${failures.size} message(s) failed to process")
      // Throw exception to trigger retry/DLQ
      throw new RuntimeException(s"Failed to process ${failures.size} message(s): ${failures.mkString(", ")}")
    }

    logger.info(s"Successfully processed ${records.size} message(s)")
  }

  private def parseRecord(record: SQSEvent.SQSMessage): Try[(AutoCancelCallout, String)] = {
    val messageId = record.getMessageId
    val rawBody = record.getBody
    logger.info(s"$messageId: Message body: $rawBody")

    for {
      originalApiGatewayEvent <- Try(Json.parse(rawBody).as[ApiGatewayToSqsMessage])
      apiToken <- originalApiGatewayEvent.queryStringParameters
        .get("apiToken")
        .toRight(new RuntimeException("no apiToken header, untrusted content"))
        .toTry
      httpRequestBody = originalApiGatewayEvent.body
      zuoraCalloutRecord <- Try(Json.parse(httpRequestBody).as[AutoCancelCallout])
      _ = logger.info(
        s"Processing auto-cancel for account: ${zuoraCalloutRecord.accountId}, invoice: ${zuoraCalloutRecord.invoiceId}",
      )
    } yield (zuoraCalloutRecord, apiToken)

  }

  def this() = this(
    LoadConfigModule(RawEffects.stage, GetFromS3.fetchString).load[TrustedApiConfig].fold(throw _, identity),
    ZuoraGetAccessToken(RawEffects.stage, GetFromSecretsManager.fetchString, RawEffects.response),
    EmailSendSteps(),
    TodayLive,
    Http.responseWithTimeout(120),
    RawEffects.stage,
  )

  private lazy val trustedApiConfig = trustedConfig
  private lazy val getAccessToken = tokenProvider
  private lazy val emailSender = emailService

  private def processCallout(callout: AutoCancelCallout, apiToken: String): ApiGatewayOp[Unit] = {
    val processingDate = dateProvider.today
    for {
      _ <- Auth
        .credentialsAreValid(trustedApiConfig, Auth.RequestAuth(Some(apiToken)))
        .toApiGatewayContinueProcessing(unauthorized)
        .withLogging("authentication")
      _ <- AutoCancelInputFilter(callout).withLogging("filter on auto pay")
      requests <- ZuoraRestRequestMaker
        .authenticated(response, stage.value, getAccessToken)
        .toApiGatewayOp("authenticate with Zuora")
      emailSteps = ZuoraEmailSteps(requests, emailSender)

      // Get the auto-cancel requests
      autoCancelRequests <- AutoCancelDataCollectionFilter(requests)(callout, processingDate).withLogging(
        s"auto-cancellation requests for ${callout.accountId}",
      )

      // Execute the cancellation
      _ <- AutoCancel(requests)(autoCancelRequests, callout.invoiceId, processingDate)
        .withLogging(s"auto-cancellation for ${callout.accountId}")

      _ <- emailSteps
        .sendCancellationEmail(callout)
        .toDisjunction
        .toApiGatewayOp("send email")

    } yield ()
  }
}

trait Today {
  def today: LocalDate
}

object TodayLive extends Today {
  override def today: LocalDate = RawEffects.now().toLocalDate
}
