package com.gu.digitalSubscriptionExpiry

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.digitalSubscriptionExpiry.emergencyToken.{EmergencyTokens, EmergencyTokensConfig}
import com.gu.effects.RawEffects
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.zuora.ZuoraRestConfig
import com.gu.util.{Config, Logging}
import play.api.libs.json.{Json, Reads}

object Handler extends Logging {
  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(RawEffects.createDefault, LambdaIO(inputStream, outputStream, context))

  case class StepsConfig(
    zuoraRestConfig: ZuoraRestConfig,
    emergencyTokens: EmergencyTokensConfig
  )

  implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

  def runWithEffects(rawEffects: RawEffects, lambdaIO: LambdaIO): Unit = {
    def operation: Config[StepsConfig] => Operation =
      config => {
        DigitalSubscriptionExpirySteps(EmergencyTokens(config.stepsConfig.emergencyTokens))
      }

    ApiGatewayHandler.default[StepsConfig](operation, lambdaIO).run((rawEffects.stage, rawEffects.s3Load(rawEffects.stage)))
  }
}

