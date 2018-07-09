package com.gu.autoCancel

import java.io.{InputStream, OutputStream}
import java.time.LocalDateTime

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.paymentFailure.ZuoraEmailSteps
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.exacttarget.{ETClient, EmailSendSteps, FilterEmail}
import com.gu.util.zuora.{ZuoraGetAccountSummary, ZuoraGetInvoiceTransactions, ZuoraRestConfig, ZuoraRestRequestMaker}
import com.gu.util.Logging
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config._
import com.gu.util.reader.Types._
import okhttp3.{Request, Response}

object AutoCancelHandler extends App with Logging {

  def runWithEffects(
    stage: Stage,
    fetchString: StringFromS3,
    response: Request => Response,
    now: () => LocalDateTime,
    lambdaIO: LambdaIO
  ): Unit = {
    def operation(zuoraRestConfig: ZuoraRestConfig, etConfig: ETConfig): ApiGatewayHandler.Operation = {

      val zuoraRequests = ZuoraRestRequestMaker(response, zuoraRestConfig)
      AutoCancelSteps(
        AutoCancel.apply(zuoraRequests),
        AutoCancelDataCollectionFilter.apply(now().toLocalDate, ZuoraGetAccountSummary(zuoraRequests)),
        etConfig.etSendIDs,
        ZuoraEmailSteps.sendEmailRegardingAccount(
          EmailSendSteps(ETClient.sendEmail(response, etConfig), FilterEmail(stage)),
          ZuoraGetInvoiceTransactions(ZuoraRestRequestMaker(response, zuoraRestConfig))
        )
      )
    }
    val loadConfigModule = LoadConfigModule(stage, fetchString)
    ApiGatewayHandler(lambdaIO)(for {
      zuoraRestConfig <- loadConfigModule[ZuoraRestConfig].toApiGatewayOp("load zuora config")
      etconfig <- loadConfigModule[ETConfig].toApiGatewayOp("load et config")
      trustedApiConfig <- loadConfigModule[TrustedApiConfig].toApiGatewayOp("load trusted Api config")
      configuredOp = operation(zuoraRestConfig, etconfig)
    } yield (trustedApiConfig, configuredOp))

  }

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(RawEffects.stage, GetFromS3.fetchString, RawEffects.response, RawEffects.now, LambdaIO(inputStream, outputStream, context))

}
