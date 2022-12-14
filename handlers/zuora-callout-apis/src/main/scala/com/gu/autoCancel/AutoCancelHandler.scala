package com.gu.autoCancel

import java.io.{InputStream, OutputStream}
import java.time.LocalDateTime

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.sqs.AwsSQSSend.{Payload, QueueName}
import com.gu.effects.sqs.SqsSync
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.paymentFailure.ZuoraEmailSteps
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.apigateway.Auth.TrustedApiConfig
import com.gu.util.apigateway.{ApiGatewayHandler, Auth}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config._
import com.gu.util.email.EmailSendSteps
import com.gu.util.reader.Types._
import com.gu.util.zuora._
import okhttp3.{Request, Response}

import scala.util.Try

object AutoCancelHandler extends App with Logging {

  def operationForEffects(
      stage: Stage,
      fetchString: StringFromS3,
      response: Request => Response,
      now: () => LocalDateTime,
      awsSQSSend: QueueName => Payload => Try[Unit],
  ): ApiGatewayOp[ApiGatewayHandler.Operation] = {
    val loadConfigModule = LoadConfigModule(stage, fetchString)
    for {
      zuoraRestConfig <- loadConfigModule[ZuoraRestConfig].toApiGatewayOp("load zuora config")
    } yield {
      val zuoraRequest = ZuoraRestRequestMaker(response, zuoraRestConfig)

      val cancelRequestsProducer = AutoCancelDataCollectionFilter(
        now().toLocalDate,
        ZuoraGetAccountSummary(zuoraRequest),
        ZuoraGetAccountSubscriptions(zuoraRequest),
        ZuoraGetSubsNamesOnInvoice(zuoraRequest),
      ) _

      AutoCancelSteps(
        AutoCancel.apply(zuoraRequest),
        cancelRequestsProducer,
        ZuoraEmailSteps.sendEmailRegardingAccount(
          EmailSendSteps(awsSQSSend(emailQueueFor(stage))),
          ZuoraGetInvoiceTransactions(ZuoraRestRequestMaker(response, zuoraRestConfig)),
        ),
      ).prependRequestValidationToSteps(Auth(loadConfigModule[TrustedApiConfig]))
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
      )
    }

  def emailQueueFor(stage: Stage): QueueName = stage match {
    case Stage("PROD") => QueueName("contributions-thanks")
    case _ => QueueName("contributions-thanks-dev")
  }

}
