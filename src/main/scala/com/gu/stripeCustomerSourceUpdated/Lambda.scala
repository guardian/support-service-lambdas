package com.gu.stripeCustomerSourceUpdated

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config._
import com.gu.util.reader.Types._
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import okhttp3.{Request, Response}

object Lambda {

  def runWithEffects(
    stage: Stage,
    fetchString: StringFromS3,
    response: Request => Response,
    lambdaIO: LambdaIO
  ): Unit = {
    def operation(zuoraRestConfig: ZuoraRestConfig, stripeConfig: StripeConfig): ApiGatewayHandler.Operation =
      SourceUpdatedSteps(
        ZuoraRestRequestMaker(response, zuoraRestConfig),
        StripeDeps(stripeConfig, new StripeSignatureChecker)
      )
    val loadConfigModule = LoadConfigModule(stage, fetchString)

    ApiGatewayHandler(lambdaIO)(for {
      zuoraRestConfig <- loadConfigModule[ZuoraRestConfig].toApiGatewayOp("load zuora config")
      stripeConfig <- loadConfigModule[StripeConfig].toApiGatewayOp("load stripe config")
      trustedApiConfig <- loadConfigModule[TrustedApiConfig].toApiGatewayOp("load trusted Api config")

      configuredOp = operation(zuoraRestConfig, stripeConfig)

    } yield (trustedApiConfig, configuredOp))

  }

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(RawEffects.stage, GetFromS3.fetchString, RawEffects.response, LambdaIO(inputStream, outputStream, context))

}
