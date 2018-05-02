package com.gu.digitalSubscriptionExpiry

import java.io.{InputStream, OutputStream}
import java.time.LocalDateTime

import com.amazonaws.services.lambda.runtime.Context
import com.gu.digitalSubscriptionExpiry.emergencyToken.{EmergencyTokens, EmergencyTokensConfig, GetTokenExpiry}
import com.gu.digitalSubscriptionExpiry.zuora._
import com.gu.effects.RawEffects
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import com.gu.util.{Config, Logging}
import play.api.libs.json.{Json, Reads}

object Handler extends Logging {
  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(RawEffects.createDefault, RawEffects.now, LambdaIO(inputStream, outputStream, context))

  case class StepsConfig(
    zuoraRestConfig: ZuoraRestConfig,
    emergencyTokens: EmergencyTokensConfig
  )

  implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

  def runWithEffects(rawEffects: RawEffects, now: () => LocalDateTime, lambdaIO: LambdaIO): Unit = {
    def operation: Config[StepsConfig] => Operation =
      config => {

        val emergencyTokens = EmergencyTokens(config.stepsConfig.emergencyTokens)
        val zuoraRequests = ZuoraRestRequestMaker(rawEffects.response, config.stepsConfig.zuoraRestConfig)
        val today = () => now().toLocalDate
        DigitalSubscriptionExpirySteps(
          getEmergencyTokenExpiry = GetTokenExpiry(emergencyTokens, today),
          getSubscription = GetSubscription(zuoraRequests),
          setActivationDate = SetActivationDate(zuoraRequests, now),
          getAccountSummary = GetAccountSummary(zuoraRequests),
          getSubscriptionExpiry = GetSubscriptionExpiry(today),
          skipActivationDateUpdate = SkipActivationDateUpdate.apply
        )
      }

    ApiGatewayHandler.default[StepsConfig](rawEffects.stage, rawEffects.s3Load(rawEffects.stage), operation, lambdaIO)
  }
}

