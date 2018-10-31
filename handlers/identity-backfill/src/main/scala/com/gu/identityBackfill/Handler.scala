package com.gu.identityBackfill

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.identity.{CreateGuestAccount, GetByEmail, IdentityClient, IdentityConfig}
import com.gu.identityBackfill.IdentityBackfillSteps.DomainRequest
import com.gu.identityBackfill.TypeConvert._
import com.gu.identityBackfill.Types.EmailAddress
import com.gu.identityBackfill.WireRequestToDomainObject.WireModel.IdentityBackfillRequest
import com.gu.identityBackfill.salesforce.ContactSyncCheck.RecordTypeId
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.identityBackfill.salesforce._
import com.gu.identityBackfill.zuora.{AddIdentityIdToAccount, CountZuoraAccountsForIdentityId, GetZuoraAccountsForEmail, GetZuoraSubTypeForAccount}
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse, ResponseModels}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.JsonHttp.StringHttpRequest
import com.gu.util.resthttp.RestRequestMaker.{GetRequest, PatchRequest}
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{HttpOp, JsonHttp, LazyClientFailableOp, RestRequestMaker}
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import okhttp3.{Request, Response}
import play.api.libs.json.{JsValue, Json, Reads}

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
      val identityClient = IdentityClient(response, identityConfig)
      val createGuestAccount = identityClient.wrapWith(JsonHttp.post).wrapWith(CreateGuestAccount.wrapper)
      val getByEmail = identityClient.wrapWith(JsonHttp.getWithParams).wrapWith(GetByEmail.wrapper)
      val countZuoraAccounts: IdentityId => ClientFailableOp[Int] = CountZuoraAccountsForIdentityId(zuoraQuerier)

      lazy val sfAuth: LazyClientFailableOp[HttpOp[StringHttpRequest, RestRequestMaker.BodyAsString]] = SalesforceClient(response, sfConfig)
      lazy val sfPatch = sfAuth.map(_.wrapWith(JsonHttp.patch))
      lazy val sfGet = sfAuth.map(_.wrapWith(JsonHttp.get))

      Operation(
        steps = WireRequestToDomainObject(IdentityBackfillSteps(
          PreReqCheck(
            getByEmail.runRequest,
            GetZuoraAccountsForEmail(zuoraQuerier) _ andThen PreReqCheck.getSingleZuoraAccountForEmail,
            countZuoraAccounts andThen PreReqCheck.noZuoraAccountsForIdentityId,
            GetZuoraSubTypeForAccount(zuoraQuerier) _ andThen PreReqCheck.acceptableReaderType,
            syncableSFToIdentity(sfGet, stage)
          ),
          createGuestAccount.runRequest,
          AddIdentityIdToAccount(zuoraRequests),
          updateSalesforceIdentityId(sfPatch)
        )),
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

  def syncableSFToIdentity(
    sfRequests: LazyClientFailableOp[HttpOp[GetRequest, JsValue]],
    stage: Stage
  )(sFContactId: SFContactId): LazyClientFailableOp[ApiGatewayOp[Unit]] =
    for {
      sfRequests <- sfRequests
      fields <- GetSFContactSyncCheckFields(sfRequests).apply(sFContactId)
    } yield for {
      standardRecordType <- standardRecordTypeForStage(stage)
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
    getByEmail: HttpOp[EmailAddress, GetByEmail.MaybeValidatedEmail],
    countZuoraAccountsForIdentityId: IdentityId => ClientFailableOp[Int],
    sfAuth: LazyClientFailableOp[Any]
  ): ApiResponse =
    (for {
      maybeIdentityId <- getByEmail.runRequest(EmailAddress("john.duffell@guardian.co.uk"))
        .toApiGatewayOp("problem with email").withLogging("healthcheck getByEmail")
      identityId <- maybeIdentityId match {
        case GetByEmail.ValidatedEmail(identityId) => ContinueProcessing(identityId)
        case other =>
          logger.error(s"failed healthcheck with $other")
          ReturnWithResponse(ApiGatewayResponse.internalServerError("test identity id was not present"))
      }
      _ <- countZuoraAccountsForIdentityId(identityId).toApiGatewayOp("get zuora accounts for identity id")
      _ <- sfAuth.value.toApiGatewayOp("Failed to authenticate with Salesforce")
    } yield ApiGatewayResponse.successfulExecution).apiResponse

}

object WireRequestToDomainObject {

  object WireModel {

    case class IdentityBackfillRequest(
      emailAddress: String,
      dryRun: Boolean
    )
    implicit val identityBackfillRequest: Reads[IdentityBackfillRequest] = Json.reads[IdentityBackfillRequest]

  }

  def apply(
    steps: DomainRequest => ResponseModels.ApiResponse
  ): ApiGatewayRequest => ResponseModels.ApiResponse = req =>
    (for {
      wireInput <- req.bodyAsCaseClass[IdentityBackfillRequest]()
      mergeRequest = toDomainRequest(wireInput)
    } yield steps(mergeRequest)).apiResponse

  def toDomainRequest(request: IdentityBackfillRequest): DomainRequest =
    DomainRequest(
      EmailAddress(request.emailAddress),
      request.dryRun
    )

}
