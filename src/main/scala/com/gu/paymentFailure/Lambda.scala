package com.gu.paymentFailure

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.stripeCustomerSourceUpdated.SourceUpdatedSteps.StepsConfig
import com.gu.util.Config
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.exacttarget.{ETClient, EmailSendSteps, FilterEmail}
import com.gu.util.zuora.{ZuoraGetInvoiceTransactions, ZuoraRestRequestMaker}

object Lambda {

  def runWithEffects(rawEffects: RawEffects, lambdaIO: LambdaIO): Unit = {
    def operation(config: Config[StepsConfig]): ApiGatewayHandler.Operation =
      PaymentFailureSteps(
        ZuoraEmailSteps.sendEmailRegardingAccount(
          EmailSendSteps(ETClient.sendEmail(rawEffects.response, config.etConfig), FilterEmail(config.stage)),
          a => ZuoraGetInvoiceTransactions(ZuoraRestRequestMaker(rawEffects.response, config.stepsConfig.zuoraRestConfig))(a)
        ),
        config.etConfig.etSendIDs,
        config.trustedApiConfig
      )
    ApiGatewayHandler.default[StepsConfig](operation, lambdaIO).run((rawEffects.stage, rawEffects.s3Load(rawEffects.stage)))
  }

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(RawEffects.createDefault, LambdaIO(inputStream, outputStream, context))

}
