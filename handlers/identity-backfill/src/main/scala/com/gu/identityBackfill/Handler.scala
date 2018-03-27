package com.gu.identityBackfill

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.identity.{GetByEmail, IdentityConfig}
import com.gu.identityBackfill.Types._
import com.gu.identityBackfill.salesforce.SalesforceAuthenticate
import com.gu.identityBackfill.salesforce.SalesforceAuthenticate.{SFConfig, SalesforceAuth}
import com.gu.identityBackfill.zuora.{AddIdentityIdToAccount, CountZuoraAccountsForIdentityId, GetZuoraAccountsForEmail}
import com.gu.util.Config
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayResponse}
import com.gu.util.reader.Types.FailableOp
import com.gu.util.zuora.{ZuoraDeps, ZuoraRestConfig}
import play.api.libs.json.{Json, Reads}
import scalaz.syntax.either._

object Handler {

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(RawEffects.createDefault, LambdaIO(inputStream, outputStream, context))

  case class StepsConfig(
    identityConfig: IdentityConfig,
    zuoraRestConfig: ZuoraRestConfig,
    sfConfig: SFConfig
  )
  implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

  def runWithEffects(rawEffects: RawEffects, lambdaIO: LambdaIO): Unit = {
    def operation: Config[StepsConfig] => Operation =
      config => {
        val zuoraDeps = ZuoraDeps(rawEffects.response, config.stepsConfig.zuoraRestConfig)
        val sfAuth = SalesforceAuthenticate(rawEffects.response, config.stepsConfig.sfConfig)
        IdentityBackfillSteps(
          GetByEmail(rawEffects.response, config.stepsConfig.identityConfig),
          GetZuoraAccountsForEmail(zuoraDeps),
          CountZuoraAccountsForIdentityId(zuoraDeps),
          AddIdentityIdToAccount(zuoraDeps),
          sfAuth.map(_ => ()),
          Function.untupled(args => sfAuth.flatMap(auth => (UpdateSalesforceIdentityId.apply(auth)_).tupled(args)))
        )
      }
    ApiGatewayHandler.default[StepsConfig](operation, lambdaIO).run((rawEffects.stage, rawEffects.s3Load(rawEffects.stage)))
  }

}

object UpdateSalesforceIdentityId {
  def apply(salesforceAuth: SalesforceAuth)(sFContactId: SFContactId, identityId: IdentityId): FailableOp[Unit] = {
    ApiGatewayResponse.internalServerError("todo").left
  }
}
