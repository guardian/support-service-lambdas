package com.gu.identityBackfill

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.identity.{GetByEmail, IdentityConfig}
import com.gu.identityBackfill.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.identityBackfill.salesforce.{SalesforceAuthenticate, UpdateSalesforceIdentityId}
import com.gu.identityBackfill.zuora.{AddIdentityIdToAccount, CountZuoraAccountsForIdentityId, GetZuoraAccountsForEmail}
import com.gu.util.Config
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.zuora.{ZuoraDeps, ZuoraRestConfig}
import play.api.libs.json.{Json, Reads}

object Handler {

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(RawEffects.createDefault, LambdaIO(inputStream, outputStream, context))

  case class StepsConfig(
    identityConfig: IdentityConfig,
    zuoraRestConfig: ZuoraRestConfig,
    sfConfig: SFAuthConfig
  )
  implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

  def runWithEffects(rawEffects: RawEffects, lambdaIO: LambdaIO): Unit = {
    def operation: Config[StepsConfig] => Operation =
      config => {
        val zuoraDeps = ZuoraDeps(rawEffects.response, config.stepsConfig.zuoraRestConfig)
        IdentityBackfillSteps(
          GetByEmail(rawEffects.response, config.stepsConfig.identityConfig),
          GetZuoraAccountsForEmail(zuoraDeps),
          CountZuoraAccountsForIdentityId(zuoraDeps),
          AddIdentityIdToAccount(zuoraDeps),
          () => SalesforceAuthenticate(rawEffects.response, config.stepsConfig.sfConfig),
          UpdateSalesforceIdentityId(rawEffects.response),

        )
      }
    ApiGatewayHandler.default[StepsConfig](operation, lambdaIO).run((rawEffects.stage, rawEffects.s3Load(rawEffects.stage)))
  }

}

