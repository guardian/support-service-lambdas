package com.gu.autoCancel

import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.gu.effects.sqs.AwsSQSSend.{EmailQueueName, Payload, QueueName}
import com.gu.effects.sqs.SqsSync
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.Logging
import com.gu.util.config.LoadConfigModule
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.Stage
import com.gu.util.email.EmailSendSteps
import com.gu.util.reader.Types._
import com.gu.util.zuora._
import okhttp3.{Request, Response}
import play.api.libs.json.Json

import java.time.LocalDateTime
import scala.jdk.CollectionConverters._
import scala.util.Try

/** This handler processes auto-cancel requests from an SQS queue. It is triggered by an EventSourceMapping with limited
  * concurrency to avoid hitting Zuora rate limits. Each invocation processes one message at a time.
  */
class AutoCancelSqsHandler extends RequestHandler[SQSEvent, Unit] with Logging {

  override def handleRequest(event: SQSEvent, context: Context): Unit = {
    val records = event.getRecords.asScala.toList
    logger.info(s"Processing ${records.size} SQS message(s)")

    val results = records.map { record =>
      processRecord(record, context)
    }

    val failures = results.collect { case Left(error) => error }
    if (failures.nonEmpty) {
      logger.error(s"${failures.size} message(s) failed to process")
      // Throw exception to trigger retry/DLQ
      throw new RuntimeException(s"Failed to process ${failures.size} message(s): ${failures.mkString(", ")}")
    }

    logger.info(s"Successfully processed ${records.size} message(s)")
  }

  private def processRecord(record: SQSEvent.SQSMessage, context: Context): Either[String, Unit] = {
    val messageId = record.getMessageId
    logger.info(s"Processing SQS message: $messageId")

    try {
      val body = record.getBody
      logger.info(s"Message body: $body")

      // Parse the callout from the message body
      val calloutResult = Json.parse(body).validate[AutoCancelCallout]

      calloutResult.fold(
        errors => {
          val errorMsg = s"Failed to parse callout from message $messageId: $errors"
          logger.error(errorMsg)
          Left(errorMsg)
        },
        callout => {
          logger.info(s"Processing auto-cancel for account: ${callout.accountId}, invoice: ${callout.invoiceId}")
          processCallout(callout, context) match {
            case Right(_) =>
              logger.info(s"Successfully processed message $messageId")
              Right(())
            case Left(error) =>
              logger.error(s"Failed to process message $messageId: $error")
              Left(error)
          }
        },
      )
    } catch {
      case e: Exception =>
        val errorMsg = s"Exception processing message $messageId: ${e.getMessage}"
        logger.error(errorMsg, e)
        Left(errorMsg)
    }
  }

  private def processCallout(callout: AutoCancelCallout, context: Context): Either[String, Unit] = {
    val stage = RawEffects.stage
    val fetchString = GetFromS3.fetchString _
    val response = RawEffects.response
    val now = RawEffects.now
    val sqsSend = SqsSync.send(SqsSync.buildClient) _

    processCalloutWithEffects(stage, fetchString, response, now, sqsSend)(callout) match {
      case ApiGatewayOp.ContinueProcessing(_) => Right(())
      case ApiGatewayOp.ReturnWithResponse(resp) =>
        if (resp.statusCode.startsWith("2")) Right(())
        else Left(s"Processing returned non-success response: ${resp.statusCode} - ${resp.body}")
    }
  }

  private def processCalloutWithEffects(
      stage: Stage,
      fetchString: StringFromS3,
      response: Request => Response,
      now: () => LocalDateTime,
      awsSQSSend: QueueName => Payload => Try[Unit],
  )(callout: AutoCancelCallout): ApiGatewayOp[Unit] = {
    val loadConfigModule = LoadConfigModule(stage, fetchString)

    for {
      zuoraRestConfig <- loadConfigModule.load[ZuoraRestConfig].toApiGatewayOp("load zuora config")
      _ = logger.info(s"Loaded Zuora config for stage: $stage")

      zuoraRequest = ZuoraRestRequestMaker(response, zuoraRestConfig)

      cancelRequestsProducer = AutoCancelDataCollectionFilter(
        now().toLocalDate,
        ZuoraGetAccountSummary(zuoraRequest),
        ZuoraGetAccountSubscriptions(zuoraRequest),
        ZuoraGetSubsNamesOnInvoice(zuoraRequest),
      ) _

      // Check if we should process this callout
      _ <- AutoCancelInputFilter(callout, onlyCancelDirectDebit = false)

      // Get the auto-cancel requests
      autoCancelRequests <- cancelRequestsProducer(callout).withLogging(
        s"auto-cancellation requests for ${callout.accountId}",
      )

      // Execute the cancellation
      _ <- AutoCancel
        .apply(zuoraRequest)(
          autoCancelRequests,
          AutoCancelSteps.AutoCancelUrlParams(onlyCancelDirectDebit = false, dryRun = false),
        )
        .withLogging(s"auto-cancellation for ${callout.accountId}")

      // Send email notification
      _ = sendEmailNotification(callout, response, zuoraRestConfig, awsSQSSend)

    } yield ()
  }

  private def sendEmailNotification(
      callout: AutoCancelCallout,
      response: Request => Response,
      zuoraRestConfig: ZuoraRestConfig,
      awsSQSSend: QueueName => Payload => Try[Unit],
  ): Unit = {
    try {
      val toMessageFn: GetPaymentData.PaymentFailureInformation => Either[String, com.gu.util.email.EmailMessage] =
        paymentInfo => ToMessage(callout, paymentInfo, com.gu.util.email.EmailId.cancelledId)

      val sendEmailResult = ZuoraEmailSteps.sendEmailRegardingAccount(
        EmailSendSteps(awsSQSSend(EmailQueueName)),
        ZuoraGetInvoiceTransactions(ZuoraRestRequestMaker(response, zuoraRestConfig)),
      )(
        callout.accountId,
        toMessageFn,
      )
      sendEmailResult match {
        case com.gu.util.resthttp.Types.ClientSuccess(_) =>
          logger.info(s"Successfully sent cancellation email for account ${callout.accountId}")
        case failure: com.gu.util.resthttp.Types.ClientFailure =>
          logger.warn(s"Failed to send cancellation email for account ${callout.accountId}: ${failure.message}")
      }
    } catch {
      case e: Exception =>
        logger.warn(s"Exception sending cancellation email for account ${callout.accountId}: ${e.getMessage}", e)
    }
  }
}
