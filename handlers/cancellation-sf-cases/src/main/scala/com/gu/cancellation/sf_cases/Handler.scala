package com.gu.cancellation.sf_cases

import java.io.{InputStream, OutputStream}

import ai.x.play.json.Jsonx
import com.amazonaws.services.lambda.runtime.Context
import com.gu.cancellation.sf_cases.TypeConvert._
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.identity.IdentityCookieToIdentityUser.{CookieValuesToIdentityUser, IdentityId, IdentityUser}
import com.gu.identity.{IdentityCookieToIdentityUser, IdentityTestUserConfig, IsIdentityTestUser}
import com.gu.salesforce.SalesforceGenericIdLookup
import com.gu.salesforce.SalesforceGenericIdLookup.{FieldName, LookupValue, SfObjectType, TSalesforceGenericIdLookup}
import com.gu.salesforce.auth.SalesforceAuthenticate
import com.gu.salesforce.auth.SalesforceAuthenticate.{SFAuthConfig, SFAuthTestConfig}
import com.gu.salesforce.cases.SalesforceCase
import com.gu.salesforce.cases.SalesforceCase.Create.WireNewCase
import com.gu.salesforce.cases.SalesforceCase.GetMostRecentCaseByContactId.TGetMostRecentCaseByContactId
import com.gu.salesforce.cases.SalesforceCase.{CaseId, CaseSubject, CaseWithId, ContactId, SubscriptionId}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config._
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{RestRequestMaker, Types}
import okhttp3.{Request, Response}
import play.api.libs.json._

object Handler extends Logging {

  case class IdentityAndSfRequests(identityUser: IdentityUser, sfRequests: RestRequestMaker.Requests)

  type HeadersOption = Option[Map[String, String]]
  type IdentityAndSfRequestsApiGatewayOp = ApiGatewayOp[IdentityAndSfRequests]
  type SfBackendForIdentityCookieHeader = HeadersOption => IdentityAndSfRequestsApiGatewayOp
  type Steps = SfBackendForIdentityCookieHeader => ApiGatewayRequest => ApiResponse
  type LazySalesforceAuthenticatedReqMaker = () => ApiGatewayOp[RestRequestMaker.Requests]
  case class SfRequests(normal: LazySalesforceAuthenticatedReqMaker, test: LazySalesforceAuthenticatedReqMaker)

  def raiseCase(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runForLegacyTestsSeeTestingMd(
      IdentityCookieToIdentityUser.defaultCookiesToIdentityUser(RawEffects.stage.isProd),
      RaiseCase.steps,
      RawEffects.response,
      RawEffects.stage,
      GetFromS3.fetchString,
      LambdaIO(inputStream, outputStream, context)
    )

  object RaiseCase {

    final case class ProductName(value: String) extends AnyVal
    implicit val formatProductName = Jsonx.formatInline[ProductName]

    final case class Reason(value: String) extends AnyVal
    implicit val formatReason = Jsonx.formatInline[Reason]

    final case class SubscriptionName(value: String) extends AnyVal
    implicit val formatSubscriptionName = Jsonx.formatInline[SubscriptionName]

    final case class ContactIdContainer(Id: String)
    implicit val readsContactIdContainer = Json.reads[ContactIdContainer]
    final case class SubscriptionIdContainer(Id: String)
    implicit val readsSubscriptionIdContainer = Json.reads[SubscriptionIdContainer]

    case class RaiseCaseDetail(
      product: ProductName,
      reason: Reason,
      subscriptionName: SubscriptionName
    )
    implicit val readsRaiseCaseDetail = Json.reads[RaiseCaseDetail]
    implicit val writesCaseWithId = Json.writes[CaseWithId]

    val STARTING_CASE_SUBJECT = "Online Cancellation Attempt"

    val buildWireNewCaseForSalesforce = (
      raiseCaseDetail: RaiseCaseDetail,
      sfSubscriptionIdContainer: SubscriptionIdContainer,
      sfContactIdContainer: ContactIdContainer
    ) =>
      WireNewCase(
        ContactId = ContactId(sfContactIdContainer.Id),
        Product__c = raiseCaseDetail.product.value,
        SF_Subscription__c = SubscriptionId(sfSubscriptionIdContainer.Id),
        Journey__c = "SV - At Risk - MB",
        Enquiry_Type__c = raiseCaseDetail.reason.value,
        Status = "Closed",
        Subject = CaseSubject(STARTING_CASE_SUBJECT)
      )

    def updateCaseReason(
      sfUpdateOp: (CaseId, JsValue) => Types.ClientFailableOp[Unit]
    )(
      reason: Reason,
      sfCase: CaseWithId
    ): ClientFailableOp[Unit] = sfUpdateOp(sfCase.Id, JsObject(Map("Enquiry_Type__c" -> JsString(reason.value))))

    type TNewOrResumeCase = (ContactIdContainer, SubscriptionIdContainer, Option[CaseWithId]) => ApiGatewayOp[CaseWithId]

    def raiseCase(
      lookupByIdOp: TSalesforceGenericIdLookup,
      recentCasesOp: TGetMostRecentCaseByContactId,
      newOrResumeCaseOp: TNewOrResumeCase
    )(
      identityId: IdentityId,
      subscriptionName: SubscriptionName
    ): ApiGatewayOp[CaseWithId] =
      for {
        sfContactId <- lookupByIdOp(
          SfObjectType("Contact"),
          FieldName("IdentityID__c"),
          LookupValue(identityId.value)
        ).map(_.Id).map(ContactIdContainer).toApiGatewayOp("lookup SF contact from identityID")
        sfSubscriptionIdContainer <- lookupByIdOp(
          SfObjectType("SF_Subscription__c"),
          FieldName("Name"),
          LookupValue(subscriptionName.value)
        ).map(_.Id).map(SubscriptionIdContainer).toApiGatewayOp("lookup SF subscription ID")
        sfRecentCases <- recentCasesOp(
          ContactId(sfContactId.Id),
          SubscriptionId(sfSubscriptionIdContainer.Id),
          CaseSubject(STARTING_CASE_SUBJECT)
        ).toApiGatewayOp("find most recent case for identity user")
        raiseCaseResponse <- newOrResumeCaseOp(sfContactId, sfSubscriptionIdContainer, sfRecentCases)
      } yield raiseCaseResponse

    type NewCase = (RaiseCaseDetail, SubscriptionIdContainer, ContactIdContainer)

    private def newOrResumeCase(
      createCaseOp: NewCase => ClientFailableOp[CaseWithId],
      updateReasonOnRecentCaseOp: (Reason, CaseWithId) => ClientFailableOp[Unit],
      raiseCaseDetail: RaiseCaseDetail
    )(
      sfContactIdContainer: ContactIdContainer,
      sfSubscriptionIdContainer: SubscriptionIdContainer,
      sfRecentCase: Option[CaseWithId]
    ) = sfRecentCase match {
      // recent case exists, so just update the reason and return the case
      case Some(recentCase) => for {
        _ <- updateReasonOnRecentCaseOp(raiseCaseDetail.reason, recentCase)
          .toApiGatewayOp("update reason of recent sf case")
      } yield recentCase
      // no recent cases so create one
      case None => createCaseOp((raiseCaseDetail, sfSubscriptionIdContainer, sfContactIdContainer))
        .toApiGatewayOp("create sf case")
    }

    def steps(sfBackendForIdentityCookieHeader: SfBackendForIdentityCookieHeader)(apiGatewayRequest: ApiGatewayRequest) =
      (for {
        identityAndSfRequests <- sfBackendForIdentityCookieHeader(apiGatewayRequest.headers)
        raiseCaseDetail <- apiGatewayRequest.bodyAsCaseClass[RaiseCaseDetail]()
        lookupByIdOp = SalesforceGenericIdLookup(identityAndSfRequests.sfRequests)_
        mostRecentCaseOp = SalesforceCase.GetMostRecentCaseByContactId(identityAndSfRequests.sfRequests)_
        createCaseOp = SalesforceCase.Create(identityAndSfRequests.sfRequests)_
        wiredCreateCaseOp = buildWireNewCaseForSalesforce.tupled andThen createCaseOp
        sfUpdateOp = SalesforceCase.Update(identityAndSfRequests.sfRequests)_
        updateReasonOnRecentCaseOp = updateCaseReason(sfUpdateOp)_
        newOrResumeCaseOp = newOrResumeCase(wiredCreateCaseOp, updateReasonOnRecentCaseOp, raiseCaseDetail)_
        wiredRaiseCase = raiseCase(lookupByIdOp, mostRecentCaseOp, newOrResumeCaseOp)_
        raiseCaseResponse <- wiredRaiseCase(identityAndSfRequests.identityUser.id, raiseCaseDetail.subscriptionName)
      } yield ApiGatewayResponse("200", raiseCaseResponse)).apiResponse
  }

  case class CasePathParams(caseId: CaseId)
  implicit val pathParamReads = Json.reads[CasePathParams]

  def updateCase(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runForLegacyTestsSeeTestingMd(
      IdentityCookieToIdentityUser.defaultCookiesToIdentityUser(RawEffects.stage.isProd),
      UpdateCase.steps,
      RawEffects.response,
      RawEffects.stage,
      GetFromS3.fetchString,
      LambdaIO(inputStream, outputStream, context)
    )

  object UpdateCase {

    case class CaseWithContactId(ContactId: ContactId)
    implicit val caseReads: Reads[CaseWithContactId] = Json.reads[CaseWithContactId]

    def verifyCaseBelongsToUser(
      lookupByIdOp: TSalesforceGenericIdLookup,
      getCaseByIdOp: CaseId => ClientFailableOp[CaseWithContactId]
    )(
      identityId: IdentityId,
      caseId: CaseId
    ) =
      for {
        sfContactIdFromIdentity <- lookupByIdOp(
          SfObjectType("Contact"),
          FieldName("IdentityID__c"),
          LookupValue(identityId.value)
        ).toApiGatewayOp("lookup SF contact ID from identityID")
        caseWithContactId <- getCaseByIdOp(caseId).toApiGatewayOp("lookup ContactId from SF Case")
        _ <- (sfContactIdFromIdentity.Id equals caseWithContactId.ContactId.value)
          .toApiGatewayContinueProcessing(ApiGatewayResponse.forbidden(
            s"Authenticated user (${sfContactIdFromIdentity.Id}) does not match ContactId ($caseWithContactId) for Case ($caseId)"
          ))
      } yield ()

    def steps(sfBackendForIdentityCookieHeader: SfBackendForIdentityCookieHeader)(apiGatewayRequest: ApiGatewayRequest) =
      (for {
        identityAndSfRequests <- sfBackendForIdentityCookieHeader(apiGatewayRequest.headers)
        pathParams <- apiGatewayRequest.pathParamsAsCaseClass[CasePathParams]()
        lookupByIdOp = SalesforceGenericIdLookup(identityAndSfRequests.sfRequests)_
        getCaseByIdOp = SalesforceCase.GetById[CaseWithContactId](identityAndSfRequests.sfRequests)_
        _ <- verifyCaseBelongsToUser(lookupByIdOp, getCaseByIdOp)(identityAndSfRequests.identityUser.id, pathParams.caseId)
        requestBody <- apiGatewayRequest.bodyAsCaseClass[JsValue]()
        sfUpdateOp = SalesforceCase.Update(identityAndSfRequests.sfRequests)_
        _ <- sfUpdateOp(pathParams.caseId, requestBody).toApiGatewayOp("update case")
      } yield ApiGatewayResponse.successfulExecution).apiResponse

  }

  def runForLegacyTestsSeeTestingMd(
    cookieValuesToIdentityUser: CookieValuesToIdentityUser,
    steps: Steps,
    response: Request => Response,
    stage: Stage,
    fetchString: StringFromS3,
    lambdaIO: LambdaIO
  ) =
    ApiGatewayHandler(lambdaIO)(operationForEffects(cookieValuesToIdentityUser, steps, response, stage, fetchString))

  def operationForEffects(
    cookieValuesToIdentityUser: CookieValuesToIdentityUser,
    steps: Steps,
    response: Request => Response,
    stage: Stage,
    fetchString: StringFromS3
  ): ApiGatewayOp[Operation] = {
    val loadConfig = LoadConfigModule(stage, fetchString)

    def healthcheckSteps(sfRequests: SfRequests) = () =>
      (for {
        _ <- sfRequests.normal()
        _ <- sfRequests.test()
      } yield ApiGatewayResponse.successfulExecution).apiResponse

    def loadNormalSfConfig = loadConfig[SFAuthConfig](SFAuthConfig.location, SFAuthConfig.reads)

    def loadTestSfConfig = loadConfig[SFAuthConfig](SFAuthTestConfig.location, SFAuthTestConfig.reads)

    for {
      identityTestUsersConfig <- loadConfig[IdentityTestUserConfig].toApiGatewayOp("load identity 'test-users' config")
      configuredOp = {

        val sfRequestsNormal: LazySalesforceAuthenticatedReqMaker = () =>
          for {
            config <- loadNormalSfConfig.toApiGatewayOp("load 'normal' SF config")
            sfRequests <- SalesforceAuthenticate(response, config)
          } yield sfRequests

        val sfRequestsTest: LazySalesforceAuthenticatedReqMaker = () =>
          for {
            config <- loadTestSfConfig.toApiGatewayOp("load 'test' SF config")
            sfRequests <- SalesforceAuthenticate(response, config)
          } yield sfRequests

        def sfBackendForIdentityCookieHeader(headers: HeadersOption): IdentityAndSfRequestsApiGatewayOp = {
          for {
            identityUser <- IdentityCookieToIdentityUser(cookieValuesToIdentityUser)(headers)
            sfRequests <- if (IsIdentityTestUser(identityTestUsersConfig)(identityUser)) sfRequestsTest() else sfRequestsNormal()
          } yield IdentityAndSfRequests(identityUser, sfRequests)
        }

        Operation(
          steps(sfBackendForIdentityCookieHeader),
          healthcheckSteps(SfRequests(sfRequestsNormal, sfRequestsTest))
        )

      }
    } yield configuredOp
  }
}
