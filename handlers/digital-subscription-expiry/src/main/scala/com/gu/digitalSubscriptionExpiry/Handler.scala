package com.gu.digitalSubscriptionExpiry

import java.io.{InputStream, OutputStream}
import java.time.LocalDateTime

import com.amazonaws.services.lambda.runtime.Context
import com.gu.digitalSubscriptionExpiry.TypeConvert._
import com.gu.digitalSubscriptionExpiry.emergencyToken.{EmergencyTokens, EmergencyTokensConfig, GetTokenExpiry}
import com.gu.digitalSubscriptionExpiry.zuora._
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config._
import com.gu.util.reader.Types._
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import okhttp3.{Request, Response}

object Handler extends Logging {
  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runForLegacyTestsSeeTestingMd(
      RawEffects.stage,
      GetFromS3.fetchString,
      RawEffects.response,
      RawEffects.now,
      LambdaIO(inputStream, outputStream, context),
    )

  def runForLegacyTestsSeeTestingMd(
      stage: Stage,
      fetchString: StringFromS3,
      response: Request => Response,
      now: () => LocalDateTime,
      lambdaIO: LambdaIO,
  ): Unit =
    ApiGatewayHandler(lambdaIO)(operationForEffects(stage, fetchString, response, now))

  def operationForEffects(
      stage: Stage,
      fetchString: StringFromS3,
      response: Request => Response,
      now: () => LocalDateTime,
  ): ApiGatewayOp[ApiGatewayHandler.Operation] = {
    val loadConfig = LoadConfigModule(stage, fetchString)
    for {
      zuoraRestConfig <- loadConfig[ZuoraRestConfig].toApiGatewayOp("load zuora config")
      emergencyTokensConfig <- loadConfig[EmergencyTokensConfig].toApiGatewayOp("load emergency tokens config")
    } yield {
      val emergencyTokens = EmergencyTokens(emergencyTokensConfig)
      val zuoraRequests = ZuoraRestRequestMaker(response, zuoraRestConfig)
      val today = () => now().toLocalDate
      DigitalSubscriptionExpirySteps(
        getEmergencyTokenExpiry = GetTokenExpiry(emergencyTokens, today),
        getSubscription = GetSubscription(zuoraRequests),
        setActivationDate =
          (SetActivationDate(zuoraRequests, now) _).andThen(_.toApiGatewayOp(s"zuora SetActivationDate fail")),
        getAccountSummary =
          (GetAccountSummary(zuoraRequests) _).andThen(_.toApiGatewayOp(s"zuora GetAccountSummary fail")),
        getSubscriptionExpiry = GetSubscriptionExpiry(today),
        skipActivationDateUpdate = SkipActivationDateUpdate.apply,
      )
    }
  }

}
