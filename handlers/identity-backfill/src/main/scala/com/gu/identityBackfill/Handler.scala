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
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.SalesforceClient.StringHttpRequest
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.salesforce.{JsonHttp, SalesforceClient}
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayResponse}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestRequestMaker.{GetRequest, PatchRequest}
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{HttpOp, LazyClientFailableOp, RestRequestMaker}
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import okhttp3.{Request, Response}
import play.api.libs.json.JsValue
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

      lazy val sfAuth: LazyClientFailableOp[HttpOp[StringHttpRequest, RestRequestMaker.BodyAsString]] = SalesforceClient(response, sfConfig)
      lazy val sfPatch = sfAuth.map(_.wrap(JsonHttp.patch))
      lazy val sfGet = sfAuth.map(_.wrap(JsonHttp.get))

      Operation(
        steps = IdentityBackfillSteps(
          PreReqCheck(
            getByEmail,
            GetZuoraAccountsForEmail(zuoraQuerier) _ andThen PreReqCheck.getSingleZuoraAccountForEmail,
            countZuoraAccounts andThen PreReqCheck.noZuoraAccountsForIdentityId,
            GetZuoraSubTypeForAccount(zuoraQuerier) _ andThen PreReqCheck.acceptableReaderType,
            syncableSFToIdentity(sfGet, stage)
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
    mappings.get(stage)
      .toApiGatewayContinueProcessing(ApiGatewayResponse.internalServerError(s"missing standard record type for stage $stage"))
  }

  def syncableSFToIdentity(sfRequests: LazyClientFailableOp[HttpOp[GetRequest, JsValue]], stage: Stage)(sFContactId: SFContactId): ApiGatewayOp[Unit] =
    for {
      sfRequests <- sfRequests.value.toApiGatewayOp("Failed to authenticate with Salesforce")
      standardRecordType <- standardRecordTypeForStage(stage)
      fields <- GetSFContactSyncCheckFields(sfRequests).apply(sFContactId).value
        .toApiGatewayOp("get contact from salesforce")
      syncable <- SyncableSFToIdentity(standardRecordType)(fields)(sFContactId)
    } yield syncable

  def updateSalesforceIdentityId(
    sfRequests: LazyClientFailableOp[HttpOp[PatchRequest, Unit]]
  )(
    sFContactId: SFContactId,
    identityId: IdentityId
  ): ApiGatewayOp[Unit] =
    for {
      sfRequests <- sfRequests.value.toApiGatewayOp("Failed to authenticate with Salesforce")
      _ <- UpdateSalesforceIdentityId(sfRequests).runRequestMultiArg(sFContactId, identityId)
        .toApiGatewayOp("update identity id in salesforce")
    } yield ()

}

object Healthcheck {
  def apply(
    getByEmail: EmailAddress => \/[GetByEmail.ApiError, IdentityId],
    countZuoraAccountsForIdentityId: IdentityId => ClientFailableOp[Int],
    sfAuth: => LazyClientFailableOp[Any]
  ): ApiResponse =
    (for {
      identityId <- getByEmail(EmailAddress("john.duffell@guardian.co.uk"))
        .toApiGatewayOp("problem with email").withLogging("healthcheck getByEmail")
      _ <- countZuoraAccountsForIdentityId(identityId).toApiGatewayOp("get zuora accounts for identity id")
      _ <- sfAuth.value.toApiGatewayOp("Failed to authenticate with Salesforce")
    } yield ApiGatewayResponse.successfulExecution).apiResponse

}
