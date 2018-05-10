package com.gu.stripeCustomerSourceUpdated

import java.io.{InputStream, OutputStream}
import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.stripeCustomerSourceUpdated.SourceUpdatedSteps.StepsConfig
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.{Config, LoadConfig}
import com.gu.util.reader.Types._
import com.gu.util.zuora.ZuoraRestRequestMaker
import okhttp3.{Request, Response}

object Lambda {

  def runWithEffects(rawEffects: RawEffects, response: Request => Response, lambdaIO: LambdaIO): Unit = {
    def operation(config: Config[StepsConfig]): ApiGatewayHandler.Operation =
      SourceUpdatedSteps(
        ZuoraRestRequestMaker(response, config.stepsConfig.zuoraRestConfig),
        StripeDeps(config.stripeConfig, new StripeSignatureChecker)
      )

    ApiGatewayHandler[StepsConfig](lambdaIO)(for {
      config <- LoadConfig.default[StepsConfig](implicitly)(rawEffects.stage, rawEffects.s3Load(rawEffects.stage), true).toFailableOp("load config")
      configuredOp = operation(config)

    } yield (config, configuredOp))

  }

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(RawEffects.createDefault, RawEffects.response, LambdaIO(inputStream, outputStream, context))

}
