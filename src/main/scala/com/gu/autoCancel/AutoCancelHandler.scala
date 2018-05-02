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
import com.gu.util.{Config, Logging}

object AutoCancelHandler extends App with Logging {

  def runWithEffects(rawEffects: RawEffects, now: () => LocalDateTime, lambdaIO: LambdaIO): Unit = {
    def operation(config: Config[StepsConfig]): ApiGatewayHandler.Operation = {

      val zuoraRequests = ZuoraRestRequestMaker(rawEffects.response, config.stepsConfig.zuoraRestConfig)
      AutoCancelSteps(
        AutoCancel.apply(zuoraRequests),
        AutoCancelDataCollectionFilter.apply(now().toLocalDate, ZuoraGetAccountSummary(zuoraRequests)),
        config.etConfig.etSendIDs,
        ZuoraEmailSteps.sendEmailRegardingAccount(
          EmailSendSteps(ETClient.sendEmail(rawEffects.response, config.etConfig), FilterEmail(config.stage)),
          a => ZuoraGetInvoiceTransactions(ZuoraRestRequestMaker(rawEffects.response, config.stepsConfig.zuoraRestConfig))(a)
        )
      )
    }
    ApiGatewayHandler.default[StepsConfig](rawEffects.stage, rawEffects.s3Load(rawEffects.stage), operation, lambdaIO)
  }

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(RawEffects.createDefault, RawEffects.now, LambdaIO(inputStream, outputStream, context))

}
