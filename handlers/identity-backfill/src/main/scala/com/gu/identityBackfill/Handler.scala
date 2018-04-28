package com.gu.identityBackfill

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.identity.{GetByEmail, IdentityConfig}
import com.gu.identityBackfill.ResponseMaker._
import com.gu.identityBackfill.Types.{EmailAddress, IdentityId}
import com.gu.identityBackfill.salesforce.ContactSyncCheck.RecordTypeId
import com.gu.identityBackfill.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.identityBackfill.salesforce._
import com.gu.identityBackfill.zuora.{AddIdentityIdToAccount, CountZuoraAccountsForIdentityId, GetZuoraAccountsForEmail, GetZuoraSubTypeForAccount}
import com.gu.util.Config
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.reader.Types._
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, Requests}
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import play.api.libs.json.{Json, Reads}
import scalaz.\/

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
        val zuoraRequests = ZuoraRestRequestMaker(rawEffects.response, config.stepsConfig.zuoraRestConfig)
        val zuoraQuerier = ZuoraQuery(zuoraRequests)
        val getByEmail: EmailAddress => \/[GetByEmail.ApiError, IdentityId] = GetByEmail(rawEffects.response, config.stepsConfig.identityConfig)
        val countZuoraAccounts: IdentityId => ClientFailableOp[Int] = CountZuoraAccountsForIdentityId(zuoraQuerier)
        lazy val sfRequests: FailableOp[Requests] = SalesforceAuthenticate(rawEffects.response, config.stepsConfig.sfConfig)

        Operation(
          steps = IdentityBackfillSteps(
            PreReqCheck(
              getByEmail,
              GetZuoraAccountsForEmail(zuoraQuerier)_ andThen PreReqCheck.getSingleZuoraAccountForEmail,
              countZuoraAccounts andThen PreReqCheck.noZuoraAccountsForIdentityId,
              GetZuoraSubTypeForAccount(zuoraQuerier)_ andThen PreReqCheck.acceptableReaderType,
              todo => sfRequests.flatMap(sfRequests => SyncableSFToIdentity(sfRequests, RecordTypeId("01220000000VB52AAG"))(todo))
            ),
            AddIdentityIdToAccount(zuoraRequests),
            (c, d) => sfRequests.flatMap(sfRequests => UpdateSalesforceIdentityId(sfRequests)(c, d).nonSuccessToError)
          ),
          healthcheck = () => Healthcheck(
            getByEmail,
            countZuoraAccounts,
            sfRequests
          )
        )
      }
    ApiGatewayHandler.default[StepsConfig](operation, lambdaIO).run((rawEffects.stage, rawEffects.s3Load(rawEffects.stage)))
  }

}

object Healthcheck {
  def apply(
    getByEmail: EmailAddress => \/[GetByEmail.ApiError, IdentityId],
    countZuoraAccountsForIdentityId: IdentityId => ClientFailableOp[Int],
    sfAuth: => FailableOp[Any],
  ): FailableOp[Unit] =
    for {
      identityId <- getByEmail(EmailAddress("john.duffell@guardian.co.uk")).nonSuccessToError.withLogging("healthcheck getByEmail")
      _ <- countZuoraAccountsForIdentityId(identityId).nonSuccessToError
      _ <- sfAuth
    } yield ()

}
