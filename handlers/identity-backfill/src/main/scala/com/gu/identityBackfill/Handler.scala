package com.gu.identityBackfill

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.identity.{GetByEmail, IdentityConfig}
import com.gu.identityBackfill.TypeConvert._
import com.gu.identityBackfill.Types.EmailAddress
import com.gu.identityBackfill.salesforce.ContactSyncCheck.RecordTypeId
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.identityBackfill.salesforce._
import com.gu.identityBackfill.zuora.{AddIdentityIdToAccount, CountZuoraAccountsForIdentityId, GetZuoraAccountsForEmail, GetZuoraSubTypeForAccount}
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.salesforce.auth.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.auth.{SalesforceAuthenticate, SalesforceRestRequestMaker}
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayResponse}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.HttpOp
import com.gu.util.resthttp.RestRequestMaker.{PatchRequest, Requests}
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import okhttp3.{Request, Response}
import scalaz.\/

object Handler {

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runForLegacyTestsSeeTestingMd(RawEffects.stage, GetFromS3.fetchString, RawEffects.response, LambdaIO(inputStream, outputStream, context))

  def runForLegacyTestsSeeTestingMd(
    stage: Stage,
    fetchString: StringFromS3,
    response: Request => Response,
    lambdaIO: LambdaIO
  ): Unit =
    ApiGatewayHandler(lambdaIO)(operationForEffects(stage, fetchString, response))

  def operationForEffects(stage: Stage, fetchString: StringFromS3, response: Request => Response): ApiGatewayOp[Operation] = {
    def operation(
      zuoraRestConfig: ZuoraRestConfig,
      sfConfig: SFAuthConfig,
      identityConfig: IdentityConfig
    ) = {
      val zuoraRequests = ZuoraRestRequestMaker(response, zuoraRestConfig)
      val zuoraQuerier = ZuoraQuery(zuoraRequests)
      val getByEmail: EmailAddress => GetByEmail.ApiError \/ IdentityId = GetByEmail(response, identityConfig)
      val countZuoraAccounts: IdentityId => ClientFailableOp[Int] = CountZuoraAccountsForIdentityId(zuoraQuerier)

      lazy val sfAuth: ApiGatewayOp[SalesforceAuthenticate.SalesforceAuth] = SalesforceAuthenticate.doAuth(response, sfConfig)
      lazy val sfRequests = sfAuth.map(salesforceAuth => SalesforceRestRequestMaker(salesforceAuth, response))
      lazy val sfPatch = sfAuth.map(salesforceAuth => SalesforceAuthenticate.patch(response, salesforceAuth))

      Operation(
        steps = IdentityBackfillSteps(
          PreReqCheck(
            getByEmail,
            GetZuoraAccountsForEmail(zuoraQuerier) _ andThen PreReqCheck.getSingleZuoraAccountForEmail,
            countZuoraAccounts andThen PreReqCheck.noZuoraAccountsForIdentityId,
            GetZuoraSubTypeForAccount(zuoraQuerier) _ andThen PreReqCheck.acceptableReaderType,
            syncableSFToIdentity(sfRequests, stage)
          ),
          AddIdentityIdToAccount(zuoraRequests),
          updateSalesforceIdentityId(sfPatch)
        ),
        healthcheck = () => Healthcheck(
          getByEmail,
          countZuoraAccounts,
          sfAuth
        )
      )
    }

    val loadConfig = LoadConfigModule(stage, fetchString)
    val fOperation = for {
      zuoraRestConfig <- loadConfig[ZuoraRestConfig].toApiGatewayOp("load zuora config")
      sfAuthConfig <- loadConfig[SFAuthConfig].toApiGatewayOp("load sfAuth config")
      identityConfig <- loadConfig[IdentityConfig].toApiGatewayOp("load identity config")
      configuredOp = operation(zuoraRestConfig, sfAuthConfig, identityConfig)

    } yield configuredOp
    fOperation
  }

  def standardRecordTypeForStage(stage: Stage): ApiGatewayOp[RecordTypeId] = {
    val mappings = Map(
      Stage("PROD") -> RecordTypeId("01220000000VB52AAG"),
      Stage("CODE") -> RecordTypeId("012g0000000DZmNAAW"),
      Stage("DEV") -> RecordTypeId("STANDARD_TEST_DUMMY")
    )
    mappings.get(stage).toApiGatewayContinueProcessing(ApiGatewayResponse.internalServerError(s"missing standard record type for stage $stage"))
  }

  def syncableSFToIdentity(sfRequests: ApiGatewayOp[Requests], stage: Stage)(sFContactId: SFContactId): ApiGatewayOp[Unit] =
    for {
      sfRequests <- sfRequests
      standardRecordType <- standardRecordTypeForStage(stage)
      syncable <- SyncableSFToIdentity(standardRecordType)(sfRequests)(sFContactId)
    } yield syncable

  def updateSalesforceIdentityId(
    sfRequests: ApiGatewayOp[HttpOp[PatchRequest, Unit]]
  )(
    sFContactId: SFContactId,
    identityId: IdentityId
  ): ApiGatewayOp[Unit] =
    for {
      sfRequests <- sfRequests
      _ <- UpdateSalesforceIdentityId(sfRequests).runRequestMultiArg(sFContactId, identityId).toApiGatewayOp("zuora issue")
    } yield ()

}

object Healthcheck {
  def apply(
    getByEmail: EmailAddress => \/[GetByEmail.ApiError, IdentityId],
    countZuoraAccountsForIdentityId: IdentityId => ClientFailableOp[Int],
    sfAuth: => ApiGatewayOp[Any]
  ): ApiResponse =
    (for {
      identityId <- getByEmail(EmailAddress("john.duffell@guardian.co.uk"))
        .toApiGatewayOp("problem with email").withLogging("healthcheck getByEmail")
      _ <- countZuoraAccountsForIdentityId(identityId).toApiGatewayOp("zuora issue")
      _ <- sfAuth
    } yield ApiGatewayResponse.successfulExecution).apiResponse

}
