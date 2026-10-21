package com.gu.autoCancel

import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.effects.sqs.AwsSQSSend.EmailQueueName
import com.gu.effects.sqs.SqsSync
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse.unauthorized
import com.gu.util.apigateway.Auth
import com.gu.util.apigateway.Auth.TrustedApiConfig
import com.gu.util.config.{ConfigLocation, ConfigReads, LoadConfigModule}
import com.gu.util.email.EmailSendSteps
import com.gu.util.reader.Types._
import com.gu.util.zuora.{
  ApplyCreditBalance,
  TransferToCreditBalance,
  ZuoraGetAccountSubscriptions,
  ZuoraGetAccountSummary,
  ZuoraGetInvoiceTransactions,
  ZuoraGetSubsNamesOnInvoice,
  ZuoraRestConfig,
  ZuoraRestRequestMaker,
  ZuoraUpdateCancellationReason,
}
import com.gu.zuora.HolidayStopProcessorZuoraConfig
import play.api.libs.json.{Json, Reads}
import sttp.client3.HttpURLConnectionBackend

import java.time.LocalDate
import scala.jdk.CollectionConverters._
import scala.util.{Failure, Try}

trait Deadline {
  def remainingTimeInMillis: Int
}

trait ProcessingClock {
  def today: LocalDate
}

object SystemProcessingClock extends ProcessingClock {
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
class AutoCancelSqsHandler extends RequestHandler[SQSEvent, Unit] with Logging {

  protected def buildProcessor(): Either[ConfigReads.ConfigFailure, ProcessCalloutSteps] = ProcessCalloutSteps.build()

  private lazy val processor: ProcessCalloutSteps = buildProcessor().fold(throw _, identity)

  // main entry point from AWS lambda
  override def handleRequest(event: SQSEvent, context: Context): Unit = {
    val records = event.getRecords.asScala.toList
    val deadline = new Deadline {
      override def remainingTimeInMillis: Int = context.getRemainingTimeInMillis
    }
    logger.info(s"Processing ${records.size} SQS message(s)")

    val results = for {
      record <- records
    } yield {
      for {
        parsedCallout <- parseRecord(record)
        (zuoraCalloutRecord, apiToken) = parsedCallout
        calloutProcessor <- Try(processor)
        _ <- calloutProcessor.execute(zuoraCalloutRecord, apiToken, deadline).toTry(())
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
    val loadConfig = LoadConfigModule(stage, GetFromS3.fetchString)
    for {
      restConfig <- loadConfig.load[ZuoraRestConfig]
      _ = logger.info(s"Loaded Zuora config for stage: $stage")
      ordersConfig <- loadConfig.load[HolidayStopProcessorZuoraConfig](
        ConfigLocation("zuoraRest", 1),
        HolidayStopProcessorZuoraConfig.reads,
      )
      trustedApiConfig <- loadConfig.load[TrustedApiConfig]
    } yield {
      val requests = ZuoraRestRequestMaker(RawEffects.response, restConfig)
      val invoiceTransactions = new ZuoraGetInvoiceTransactions(requests)
      val cancellations = ZuoraOrderCancellationSteps.factory(requests, ordersConfig, HttpURLConnectionBackend())
      val sendPayload = SqsSync.send(SqsSync.buildClient)(EmailQueueName) _
      val emailSender = new EmailSendSteps(sendPayload)
      new ProcessCalloutSteps(
        new AutoCancel(
          cancellations,
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
        SystemProcessingClock,
        trustedApiConfig,
      )
    }
  }

}

class ProcessCalloutSteps(
    autoCancel: AutoCancel,
    cancelRequestsProducer: AutoCancelDataCollectionFilter,
    emailSteps: ZuoraEmailSteps,
    clock: ProcessingClock,
    trustedApiConfig: TrustedApiConfig,
) {
  def execute(
      autoCancelCallout: AutoCancelCallout,
      apiToken: String,
      deadline: Deadline,
  ): ApiGatewayOp[Unit] = {

    val processingDate = clock.today

    for {
      _ <- Auth
        .credentialsAreValid(trustedApiConfig, Auth.RequestAuth(Some(apiToken)))
        .toApiGatewayContinueProcessing(unauthorized)
        .withLogging("authentication")

      // Check if we should process this callout
      _ <- AutoCancelInputFilter(autoCancelCallout).withLogging("filter on auto pay")

      // Get the auto-cancel requests
      autoCancelRequests <- cancelRequestsProducer(autoCancelCallout, processingDate).withLogging(
        s"auto-cancellation requests for ${autoCancelCallout.accountId}",
      )

      // Execute the cancellation
      _ <- autoCancel
        .cancelAll(autoCancelRequests, deadline, processingDate)
        .withLogging(s"auto-cancellation for ${autoCancelCallout.accountId}")

      _ <- emailSteps
        .sendCancellationEmail(autoCancelCallout)
        .toDisjunction
        .toApiGatewayOp("send email")

    } yield ()
  }
}
