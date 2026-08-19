package com.gu.autoCancel

import java.io.{InputStream, OutputStream}
import java.time.LocalDateTime
import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.sqs.AwsSQSSend.{EmailQueueName, Payload, QueueName}
import com.gu.effects.sqs.SqsSync
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.apigateway.Auth.TrustedApiConfig
import com.gu.util.apigateway.{ApiGatewayHandler, Auth}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config._
import com.gu.util.email.EmailSendSteps
import com.gu.util.reader.Types._
import com.gu.util.zuora._
import com.gu.zuora.HolidayStopProcessorZuoraConfig
import okhttp3.{Request, Response}
import sttp.client3.HttpURLConnectionBackend

import scala.util.Try

object AutoCancelHandler extends App with Logging {

  def operationForEffects(
      stage: Stage,
      fetchString: StringFromS3,
      response: Request => Response,
      now: () => LocalDateTime,
      awsSQSSend: QueueName => Payload => Try[Unit],
      getRemainingTimeInMillis: () => Int,
  ): ApiGatewayOp[ApiGatewayHandler.Operation] = {
    val loadConfigModule = LoadConfigModule(stage, fetchString)
    for {
      zuoraRestConfig <- loadConfigModule.load[ZuoraRestConfig].toApiGatewayOp("load zuora config")
      zuoraOrdersConfig <- loadConfigModule
        .load[HolidayStopProcessorZuoraConfig](ConfigLocation("zuoraRest", 1), HolidayStopProcessorZuoraConfig.reads)
        .toApiGatewayOp("load zuora orders config")
    } yield {
      val zuoraRequest = ZuoraRestRequestMaker(response, zuoraRestConfig)
      val processingDate = now().toLocalDate

      val cancelRequestsProducer = AutoCancelDataCollectionFilter(
        processingDate,
        ZuoraGetAccountSummary(zuoraRequest),
        ZuoraGetAccountSubscriptions(zuoraRequest),
        ZuoraGetSubsNamesOnInvoice(zuoraRequest),
      ) _

      AutoCancelSteps(
        AutoCancel.apply(
          zuoraRequest,
          zuoraOrdersConfig,
          HttpURLConnectionBackend(),
          getRemainingTimeInMillis,
          processingDate,
        ),
        cancelRequestsProducer,
        new ZuoraEmailSteps(
          EmailSendSteps(awsSQSSend(EmailQueueName)),
          ZuoraGetInvoiceTransactions(ZuoraRestRequestMaker(response, zuoraRestConfig)),
        ),
      ).prependRequestValidationToSteps(Auth(loadConfigModule.load[TrustedApiConfig]))
    }
  }

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context)) {
      operationForEffects(
        RawEffects.stage,
        GetFromS3.fetchString,
        RawEffects.response,
        RawEffects.now,
        SqsSync.send(SqsSync.buildClient),
        context.getRemainingTimeInMillis _,
      )
    }
}
