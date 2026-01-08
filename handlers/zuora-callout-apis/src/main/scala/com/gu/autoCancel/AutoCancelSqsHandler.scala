package com.gu.autoCancel

import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.gu.autoCancel.GetPaymentData.PaymentFailureInformation
import com.gu.effects.sqs.AwsSQSSend.EmailQueueName
import com.gu.effects.sqs.SqsSync
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse.unauthorized
import com.gu.util.apigateway.Auth
import com.gu.util.apigateway.Auth.TrustedApiConfig
import com.gu.util.config.{ConfigReads, LoadConfigModule}
import com.gu.util.email.{EmailId, EmailSendSteps}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestRequestMaker
import com.gu.util.zuora._
import play.api.libs.json.{Json, Reads}

import java.time.LocalDateTime
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
class AutoCancelSqsHandler extends RequestHandler[SQSEvent, Unit] with Logging {

  // main entry point from AWS lambda
  override def handleRequest(event: SQSEvent, context: Context): Unit = {
    val records = event.getRecords.asScala.toList
    logger.info(s"Processing ${records.size} SQS message(s)")

    val results = for {
      record <- records
    } yield {
      for {
        parsedCallout <- parseRecord(record)
        (zuoraCalloutRecord, apiToken) = parsedCallout
        processor <- ProcessCalloutSteps.build().toTry
        _ <- processor.execute(zuoraCalloutRecord, apiToken).toTry(())
      } yield ()
    }

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

}

object ProcessCalloutSteps extends Logging {

  def build(): Either[ConfigReads.ConfigFailure, ProcessCalloutSteps] = {
    val stage = RawEffects.stage
    val fetchString = GetFromS3.fetchString _
    val response = RawEffects.response
    val now = RawEffects.now
    val sqsSend = SqsSync.send(SqsSync.buildClient) _
    val loadConfigModule = LoadConfigModule(stage, fetchString)

    for {
      zuoraRestConfig <- loadConfigModule.load[ZuoraRestConfig]
      _ = logger.info(s"Loaded Zuora config for stage: $stage")

      zuoraRequest = ZuoraRestRequestMaker(response, zuoraRestConfig)

      zuoraEmailSteps = new ZuoraEmailSteps(
        EmailSendSteps(sqsSend(EmailQueueName)),
        ZuoraGetInvoiceTransactions(ZuoraRestRequestMaker(response, zuoraRestConfig)),
      )
      trustedApiConfig <- loadConfigModule.load[TrustedApiConfig]

    } yield new ProcessCalloutSteps(zuoraRequest, now, trustedApiConfig, zuoraEmailSteps)
  }

}

class ProcessCalloutSteps(
    zuoraRequest: RestRequestMaker.Requests,
    now: () => LocalDateTime,
    trustedApiConfig: TrustedApiConfig,
    zuoraEmailSteps: ZuoraEmailSteps,
) {
  def execute(autoCancelCallout: AutoCancelCallout, apiToken: String): ApiGatewayOp[Unit] = {

    for {
      _ <- Auth
        .credentialsAreValid(trustedApiConfig, Auth.RequestAuth(Some(apiToken)))
        .toApiGatewayContinueProcessing(unauthorized)
        .withLogging("authentication")

      cancelRequestsProducer = AutoCancelDataCollectionFilter(
        now().toLocalDate,
        ZuoraGetAccountSummary(zuoraRequest),
        ZuoraGetAccountSubscriptions(zuoraRequest),
        ZuoraGetSubsNamesOnInvoice(zuoraRequest),
      ) _

      // Check if we should process this callout
      _ <- AutoCancelInputFilter(autoCancelCallout, onlyCancelDirectDebit = false)

      // Get the auto-cancel requests
      autoCancelRequests <- cancelRequestsProducer(autoCancelCallout).withLogging(
        s"auto-cancellation requests for ${autoCancelCallout.accountId}",
      )

      // Execute the cancellation
      _ <- AutoCancel(zuoraRequest)(
        autoCancelRequests,
        AutoCancelSteps.AutoCancelUrlParams(onlyCancelDirectDebit = false, dryRun = false),
      )
        .withLogging(s"auto-cancellation for ${autoCancelCallout.accountId}")

      request = ToMessage(autoCancelCallout, _: PaymentFailureInformation, EmailId.cancelledId)
      _ <- zuoraEmailSteps
        .sendEmailRegardingAccount(autoCancelCallout.accountId, request)
        .toDisjunction
        .toApiGatewayOp("send email")

    } yield ()
  }
}
