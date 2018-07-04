package com.gu.stripeCustomerSourceUpdated

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.stripeCustomerSourceUpdated.SourceUpdatedSteps.StepsConfig
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.{Config, LoadConfig, Stage}
import com.gu.util.reader.Types._
import com.gu.util.zuora.ZuoraRestRequestMaker
import okhttp3.{Request, Response}
import scalaz.\/

object Lambda {

  def runWithEffects(
    stage: Stage,
    s3Load: Stage => ConfigFailure \/ String,
    response: Request => Response,
    lambdaIO: LambdaIO
  ): Unit = {
    def operation(config: Config[StepsConfig]): ApiGatewayHandler.Operation =
      SourceUpdatedSteps(
        ZuoraRestRequestMaker(response, config.stepsConfig.zuoraRestConfig),
        StripeDeps(config.stripeConfig, new StripeSignatureChecker)
      )

    ApiGatewayHandler[StepsConfig](lambdaIO)(for {
      config <- LoadConfig.default[StepsConfig](implicitly)(stage, s3Load(stage))
        .toApiGatewayOp("load config")
      configuredOp = operation(config)

    } yield (config.trustedApiConfig, configuredOp))

  }

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(RawEffects.stage, RawEffects.s3Load, RawEffects.response, LambdaIO(inputStream, outputStream, context))

}
