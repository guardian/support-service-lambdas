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
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayResponse}
import com.gu.util.reader.Types._
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, Requests}
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import com.gu.util.config.{Config, LoadConfig, Stage}
import okhttp3.{Request, Response}
import play.api.libs.json.{Json, Reads}
import scalaz.\/
import scalaz.syntax.std.either._

object Handler {

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(RawEffects.createDefault, RawEffects.response, LambdaIO(inputStream, outputStream, context))

  case class StepsConfig(
    identityConfig: IdentityConfig,
    zuoraRestConfig: ZuoraRestConfig,
    sfConfig: SFAuthConfig
  )
  implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

  def runWithEffects(rawEffects: RawEffects, response: Request => Response, lambdaIO: LambdaIO): Unit = {
    def operation: Config[StepsConfig] => Operation =
      config => {
        val zuoraRequests = ZuoraRestRequestMaker(response, config.stepsConfig.zuoraRestConfig)
        val zuoraQuerier = ZuoraQuery(zuoraRequests)
        val getByEmail: EmailAddress => \/[GetByEmail.ApiError, IdentityId] = GetByEmail(response, config.stepsConfig.identityConfig)
        val countZuoraAccounts: IdentityId => ClientFailableOp[Int] = CountZuoraAccountsForIdentityId(zuoraQuerier)
        lazy val sfRequests: FailableOp[Requests] = SalesforceAuthenticate(response, config.stepsConfig.sfConfig)

        Operation(
          steps = IdentityBackfillSteps(
            PreReqCheck(
              getByEmail,
              GetZuoraAccountsForEmail(zuoraQuerier)_ andThen PreReqCheck.getSingleZuoraAccountForEmail,
              countZuoraAccounts andThen PreReqCheck.noZuoraAccountsForIdentityId,
              GetZuoraSubTypeForAccount(zuoraQuerier)_ andThen PreReqCheck.acceptableReaderType,
              syncableSFToIdentity(sfRequests, config.stage)
            ),
            AddIdentityIdToAccount(zuoraRequests),
            updateSalesforceIdentityId(sfRequests)
          ),
          healthcheck = () => Healthcheck(
            getByEmail,
            countZuoraAccounts,
            sfRequests
          )
        )
      }

    ApiGatewayHandler[StepsConfig](lambdaIO)(for {
      config <- LoadConfig.default[StepsConfig] (implicitly) (rawEffects.stage, rawEffects.s3Load(rawEffects.stage), true).toFailableOp("load config")
      configuredOp = operation(config)

    } yield (config, configuredOp))

  }

  def standardRecordTypeForStage(stage: Stage): FailableOp[RecordTypeId] = {
    val mappings = Map(
      Stage("PROD") -> RecordTypeId("01220000000VB52AAG"),
      Stage("CODE") -> RecordTypeId("012g0000000DZmNAAW"),
      Stage("DEV") -> RecordTypeId("STANDARD_TEST_DUMMY")
    )
    mappings.get(stage).toRight(ApiGatewayResponse.internalServerError(s"missing config for stage $stage")).disjunction
  }

  def syncableSFToIdentity(sfRequests: => FailableOp[Requests], stage: Stage)(sFContactId: Types.SFContactId) : FailableOp[Unit] =
    for {
      sfRequests <- sfRequests
      standardRecordType <- standardRecordTypeForStage(stage)
      syncable <- SyncableSFToIdentity(standardRecordType)(sfRequests)(sFContactId)
    } yield syncable

  def updateSalesforceIdentityId(sfRequests: => FailableOp[Requests])(sFContactId: Types.SFContactId, identityId: IdentityId): FailableOp[Unit] = for {
    sfRequests <- sfRequests
    _ <- UpdateSalesforceIdentityId(sfRequests)(sFContactId, identityId).nonSuccessToError
  } yield ()

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
