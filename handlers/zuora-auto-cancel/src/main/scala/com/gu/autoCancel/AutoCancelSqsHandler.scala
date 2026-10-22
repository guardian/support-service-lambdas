package com.gu.autoCancel

import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.gu.effects.{GetFromS3, GetFromSecretsManager, RawEffects}
import com.gu.util.Logging
import com.gu.util.TypeConvert._
import com.gu.util.apigateway.ApiGatewayResponse.unauthorized
import com.gu.util.apigateway.Auth
import com.gu.util.apigateway.Auth.TrustedApiConfig
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.email.{EmailSender, EmailSendSteps}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.zuora.{
  ApplyCreditBalance,
  GetAccessToken,
  TransferToCreditBalance,
  ZuoraGetAccessToken,
  ZuoraGetAccountSubscriptions,
  ZuoraGetAccountSummary,
  ZuoraGetInvoiceTransactions,
  ZuoraGetSubsNamesOnInvoice,
  ZuoraOAuthConfig,
  ZuoraOrderCancellation,
  ZuoraRestRequestMaker,
  ZuoraUpdateCancellationReason,
}
import okhttp3.{Request, Response}
import play.api.libs.json.{Json, Reads}

import java.time.LocalDate
import scala.jdk.CollectionConverters._
import scala.util.{Failure, Try}

trait Today {
  def today: LocalDate
}

object TodayLive extends Today {
  override def today: LocalDate = RawEffects.now().toLocalDate
}

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

  def this() = this(
    LoadConfigModule(RawEffects.stage, GetFromS3.fetchString).load[TrustedApiConfig].fold(throw _, identity),
    ZuoraGetAccessToken(RawEffects.stage, GetFromSecretsManager.fetchString, RawEffects.response),
    EmailSendSteps(),
    TodayLive,
    RawEffects.response,
    RawEffects.stage,
  )

  private lazy val trustedApiConfig = trustedConfig
  private lazy val getAccessToken = tokenProvider
  private lazy val emailSender = emailService

  // main entry point from AWS lambda
  override def handleRequest(event: SQSEvent, context: Context): Unit = {
    val records = event.getRecords.asScala.toList
    logger.info(s"Processing ${records.size} SQS message(s)")

    val results = records.map(processRecord)
    val failures = results.collect { case Failure(error) => error }
    if (failures.nonEmpty) {
      logger.error(s"${failures.size} message(s) failed to process")
      // Throw exception to trigger retry/DLQ
      throw new RuntimeException(s"Failed to process ${failures.size} message(s): ${failures.mkString(", ")}")
    }

    logger.info(s"Successfully processed ${records.size} message(s)")
  }

  private def processRecord(record: SQSEvent.SQSMessage): Try[Unit] =
    for {
      (callout, apiToken) <- parseRecord(record)
      result <- Try(processCallout(callout, apiToken))
      _ <- result.toTry(())
    } yield ()

  private def processCallout(callout: AutoCancelCallout, apiToken: String): ApiGatewayOp[Unit] = {
    val processingDate = dateProvider.today
    for {
      _ <- Auth
        .credentialsAreValid(trustedApiConfig, Auth.RequestAuth(Some(apiToken)))
        .toApiGatewayContinueProcessing(unauthorized)
        .withLogging("authentication")
      _ <- AutoCancelInputFilter(callout).withLogging("filter on auto pay")
      token <- getAccessToken.get().toApiGatewayOp("authenticate with Zuora")
      requests = ZuoraRestRequestMaker.oauth(response, ZuoraOAuthConfig.serverUrl(stage.value) + "/v1", token)
      _ <- CalloutSteps(requests, emailSender).execute(callout, processingDate)
    } yield ()
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

}

object CalloutSteps {
  def apply(requests: Requests, emailSender: EmailSender): CalloutSteps = {
    val invoiceTransactions = new ZuoraGetInvoiceTransactions(requests)
    new CalloutSteps(
      new AutoCancel(
        new ZuoraOrderCancellation(requests),
        invoiceTransactions,
        new TransferToCreditBalance(requests),
        new ApplyCreditBalance(requests),
        new ZuoraUpdateCancellationReason(requests),
      ),
      new AutoCancelDataCollectionFilter(
        new ZuoraGetAccountSummary(requests),
        new ZuoraGetAccountSubscriptions(requests),
        new ZuoraGetSubsNamesOnInvoice(requests),
      ),
      new ZuoraEmailSteps(emailSender, invoiceTransactions),
    )
  }
}

class CalloutSteps(
    autoCancel: AutoCancel,
    cancelRequestsProducer: AutoCancelDataCollectionFilter,
    emailSteps: ZuoraEmailSteps,
) {
  def execute(autoCancelCallout: AutoCancelCallout, processingDate: LocalDate): ApiGatewayOp[Unit] =
    for {
      // Get the auto-cancel requests
      autoCancelRequests <- cancelRequestsProducer(autoCancelCallout, processingDate).withLogging(
        s"auto-cancellation requests for ${autoCancelCallout.accountId}",
      )

      // Execute the cancellation
      _ <- autoCancel
        .cancelAll(autoCancelRequests, autoCancelCallout.invoiceId, processingDate)
        .withLogging(s"auto-cancellation for ${autoCancelCallout.accountId}")

      _ <- emailSteps
        .sendCancellationEmail(autoCancelCallout)
        .toDisjunction
        .toApiGatewayOp("send email")

    } yield ()
}
