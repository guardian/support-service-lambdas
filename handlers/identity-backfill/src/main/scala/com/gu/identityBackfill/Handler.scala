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
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayResponse}
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
              Need(SyncableSFToIdentity(RecordTypeId("01220000000VB52AAG"))).withFailableDep(sfRequests)
//                withSF(sfRequests, SyncableSFToIdentity(RecordTypeId("01220000000VB52AAG")))
//                todo => sfRequests.flatMap(sfRequests => SyncableSFToIdentity(sfRequests, RecordTypeId("01220000000VB52AAG"))(todo))
            ),
            AddIdentityIdToAccount(zuoraRequests),
            Need.from2(UpdateSalesforceIdentityId.apply).errMap(e => ApiGatewayResponse.internalServerError(e.message)).withFailableDep(sfRequests)
//              withSF(sfRequests, (UpdateSalesforceIdentityId.apply _).andThen(_.tupled.andThen(_.nonSuccessToError)))
//            (c, d) => sfRequests.flatMap(sfRequests => UpdateSalesforceIdentityId(sfRequests)(c, d).nonSuccessToError)
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

//  def withSF[PARAM, RESULT](lazyMaybeRequests: => FailableOp[Requests], f: Requests => PARAM => FailableOp[RESULT]): PARAM => FailableOp[RESULT] = { param =>
//    lazyMaybeRequests.flatMap(sfRequests => f(sfRequests)(param))
//  }

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

object Need {
  def from2[DEP, P1, P2, ERR, RESULT](f: DEP => (P1, P2) => ERR \/ RESULT): Need[DEP, (P1, P2), ERR, RESULT] =
    Need(f.andThen(_.tupled))
}

case class Need[DEP, PARAM, ERR, RESULT](f: DEP => PARAM => ERR \/ RESULT) {
  def withFailableDep(failableDep: => ERR \/ DEP): PARAM => ERR \/ RESULT = { param =>
    failableDep.flatMap(dep => f(dep)(param))
  }
  def errMap[NEWERR](map: ERR => NEWERR): Need[DEP, PARAM, NEWERR, RESULT] =
    Need(f.andThen(_.andThen(_.leftMap(map))))
}
