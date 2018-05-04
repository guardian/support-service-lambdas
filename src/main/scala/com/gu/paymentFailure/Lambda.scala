package com.gu.paymentFailure

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.stripeCustomerSourceUpdated.SourceUpdatedSteps.StepsConfig
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.{Config, LoadConfig}
import com.gu.util.exacttarget.{ETClient, EmailSendSteps, FilterEmail}
import com.gu.util.zuora.{ZuoraGetInvoiceTransactions, ZuoraRestRequestMaker}
import okhttp3.{Request, Response}

object Lambda {

  def runWithEffects(rawEffects: RawEffects, response: Request => Response, lambdaIO: LambdaIO): Unit = {
    def operation(config: Config[StepsConfig]): ApiGatewayHandler.Operation =
      PaymentFailureSteps(
        ZuoraEmailSteps.sendEmailRegardingAccount(
          EmailSendSteps(ETClient.sendEmail(response, config.etConfig), FilterEmail(config.stage)),
          ZuoraGetInvoiceTransactions(ZuoraRestRequestMaker(response, config.stepsConfig.zuoraRestConfig))
        ),
        config.etConfig.etSendIDs,
        config.trustedApiConfig
      )

    ApiGatewayHandler[StepsConfig](lambdaIO)(for {
      config <- LoadConfig.default[StepsConfig](implicitly)(rawEffects.stage, rawEffects.s3Load(rawEffects.stage))
      configuredOp = operation(config)

    } yield (config, configuredOp))

  }

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(RawEffects.createDefault, RawEffects.response, LambdaIO(inputStream, outputStream, context))

}
