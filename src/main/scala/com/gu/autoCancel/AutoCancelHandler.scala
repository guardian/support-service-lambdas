package com.gu.autoCancel

import java.io.{InputStream, OutputStream}
import java.time.LocalDateTime
import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.sqs.AwsSQSSend
import com.gu.effects.sqs.AwsSQSSend.QueueName
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
import com.gu.util.zuora.{ZuoraGetAccountSummary, ZuoraGetInvoiceTransactions, ZuoraRestConfig, ZuoraRestRequestMaker}
import okhttp3.{Request, Response}

object AutoCancelHandler extends App with Logging {

  def operationForEffects(
    stage: Stage,
    fetchString: StringFromS3,
    response: Request => Response,
    now: () => LocalDateTime
  ): ApiGatewayOp[ApiGatewayHandler.Operation] = {
    val loadConfigModule = LoadConfigModule(stage, fetchString)
    for {
      zuoraRestConfig <- loadConfigModule[ZuoraRestConfig].toApiGatewayOp("load zuora config")
      etConfig <- loadConfigModule[EmailConfig].toApiGatewayOp("load et config")
    } yield {
      val zuoraRequests = ZuoraRestRequestMaker(response, zuoraRestConfig)
      AutoCancelSteps(
        AutoCancel.apply(zuoraRequests),
        AutoCancelDataCollectionFilter.apply(now().toLocalDate, ZuoraGetAccountSummary(zuoraRequests)),
        etConfig.emailSendIds,
        ZuoraEmailSteps.sendEmailRegardingAccount(
          EmailSendSteps(AwsSQSSend.sendSync(emailQueueFor(stage))),
          ZuoraGetInvoiceTransactions(ZuoraRestRequestMaker(response, zuoraRestConfig))
        )
      ).prependRequestValidationToSteps(Auth(loadConfigModule[TrustedApiConfig]))
    }
  }

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context)) {
      operationForEffects(RawEffects.stage, GetFromS3.fetchString, RawEffects.response, RawEffects.now)
    }

  def emailQueueFor(stage: Stage): QueueName = stage match {
    case Stage("PROD") => QueueName("contributions-thanks")
    case _ => QueueName("contributions-thanks-dev")
  }

}
