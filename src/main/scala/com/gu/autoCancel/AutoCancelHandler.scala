package com.gu.autoCancel

import java.io.{InputStream, OutputStream}
import java.time.LocalDateTime

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.paymentFailure.ZuoraEmailSteps
import com.gu.stripeCustomerSourceUpdated.SourceUpdatedSteps.StepsConfig
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.exacttarget.{ETClient, EmailSendSteps, FilterEmail}
import com.gu.util.zuora.{ZuoraGetAccountSummary, ZuoraGetInvoiceTransactions, ZuoraRestRequestMaker}
import com.gu.util.Logging
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.{Config, LoadConfig, Stage}
import com.gu.util.reader.Types._
import okhttp3.{Request, Response}
import scalaz.\/

object AutoCancelHandler extends App with Logging {

  def runWithEffects(
    stage: Stage,
    s3Load: Stage => ConfigFailure \/ String,
    response: Request => Response,
    now: () => LocalDateTime,
    lambdaIO: LambdaIO
  ): Unit = {
    def operation(config: Config[StepsConfig]): ApiGatewayHandler.Operation = {

      val zuoraRequests = ZuoraRestRequestMaker(response, config.stepsConfig.zuoraRestConfig)
      AutoCancelSteps(
        AutoCancel.apply(zuoraRequests),
        AutoCancelDataCollectionFilter.apply(now().toLocalDate, ZuoraGetAccountSummary(zuoraRequests)),
        config.etConfig.etSendIDs,
        ZuoraEmailSteps.sendEmailRegardingAccount(
          EmailSendSteps(ETClient.sendEmail(response, config.etConfig), FilterEmail(config.stage)),
          ZuoraGetInvoiceTransactions(ZuoraRestRequestMaker(response, config.stepsConfig.zuoraRestConfig))
        )
      )
    }

    ApiGatewayHandler[StepsConfig](lambdaIO)(for {
      config <- LoadConfig.default[StepsConfig](implicitly)(stage, s3Load(stage))
        .toApiGatewayOp("load config")
      configuredOp = operation(config)
    } yield (config, configuredOp))

  }

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(RawEffects.stage, RawEffects.s3Load, RawEffects.response, RawEffects.now, LambdaIO(inputStream, outputStream, context))

}
