package com.gu.cancellation.sf_cases

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.cancellation.sf_cases.TypeConvert._
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.identity.IdentityCookieToIdentityUser.{CookieValuesToIdentityUser, IdentityUser}
import com.gu.identity.{IdentityCookieToIdentityUser, IdentityTestUserConfig, IsIdentityTestUser}
import com.gu.salesforce.SalesforceGenericIdLookup
import com.gu.salesforce.SalesforceGenericIdLookup.{ResponseWithId, SalesforceGenericIdLookupParams, TSalesforceGenericIdLookup}
import com.gu.salesforce.auth.SalesforceAuthenticate
import com.gu.salesforce.auth.SalesforceAuthenticate.{SFAuthConfig, SFAuthTestConfig}
import com.gu.salesforce.cases.SalesforceCase
import com.gu.salesforce.cases.SalesforceCase.GetMostRecentCaseByContactId.{GetMostRecentCaseByContactIdParams, TGetMostRecentCaseByContactId}
import com.gu.salesforce.cases.SalesforceCase.Raise.{NewCase, RaiseCase}
import com.gu.salesforce.cases.SalesforceCase.{CaseWithId, GetMostRecentCaseByContactId}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config._
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
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

    case class ProductName(value: String)
    case class Reason(value: String)
    case class SubscriptionName(value: String)

    case class RaiseRequestBody(
      product: String,
      reason: String,
      subscriptionName: String
    )
    case class RaiseCaseDetail(
      product: ProductName,
      reason: Reason,
      subscriptionName: SubscriptionName
    )
    object RaiseCaseDetail {
      def apply(raiseRequestBody: RaiseRequestBody): RaiseCaseDetail = new RaiseCaseDetail(
        ProductName(raiseRequestBody.product),
        Reason(raiseRequestBody.reason),
        SubscriptionName(raiseRequestBody.subscriptionName)
      )
    }
    implicit val reads = Json.reads[RaiseRequestBody]
    implicit val writes = Json.writes[CaseWithId]

    val CASE_ORIGIN = "Self Service"
    val STARTING_CASE_SUBJECT = "Online Cancellation Attempt"

    def buildNewCaseForSalesforce(
      raiseCaseDetail: RaiseCaseDetail,
      sfSubscriptionIdContainer: ResponseWithId,
      sfContactIdContainer: ResponseWithId
    ) =
      NewCase(
        Origin = CASE_ORIGIN,
        ContactId = sfContactIdContainer.Id,
        Product__c = raiseCaseDetail.product.value,
        SF_Subscription__c = sfSubscriptionIdContainer.Id,
        Journey__c = "SV - At Risk - MB",
        Enquiry_Type__c = raiseCaseDetail.reason.value,
        Status = "Closed",
        Subject = STARTING_CASE_SUBJECT
      )

    def updateReasonOnRecentCase(
      sfUpdateOp: (String, JsValue) => Types.ClientFailableOp[Unit]
    )(
      reason: Reason,
      recentCase: CaseWithId
    ): ClientFailableOp[CaseWithId] = for {
      _ <- sfUpdateOp(recentCase.Id, JsObject(Map("Enquiry_Type__c" -> JsString(reason.value))))
    } yield recentCase

    def raiseCase(
      lookupByIdOp: TSalesforceGenericIdLookup,
      recentCasesOp: TGetMostRecentCaseByContactId,
      raiseOrResumeCaseOp: TRaiseOrResumeCase
    )(
      identityId: String,
      subscriptionName: SubscriptionName
    ): ApiGatewayOp[CaseWithId] =
      for {
        sfContactId <- lookupByIdOp(SalesforceGenericIdLookupParams(
          sfObjectType = "Contact",
          fieldName = "IdentityID__c",
          lookupValue = identityId
        )).toApiGatewayOp("lookup SF contact from identityID")
        sfSubscriptionIdContainer <- lookupByIdOp(SalesforceGenericIdLookupParams(
          sfObjectType = "SF_Subscription__c",
          fieldName = "Name",
          lookupValue = subscriptionName.value
        )).toApiGatewayOp("lookup SF subscription ID")
        sfRecentCases <- recentCasesOp(GetMostRecentCaseByContactIdParams(
          contactId = sfContactId.Id,
          caseOrigin = CASE_ORIGIN,
          subscriptionId = sfSubscriptionIdContainer.Id,
          caseSubject = STARTING_CASE_SUBJECT
        )).toApiGatewayOp("find most recent case for identity user")
        raiseCaseResponse <- raiseOrResumeCaseOp(sfContactId, sfSubscriptionIdContainer, sfRecentCases)
      } yield raiseCaseResponse

    type TRaiseOrResumeCase = (ResponseWithId, ResponseWithId, GetMostRecentCaseByContactId.RecentCases) => ApiGatewayOp[CaseWithId]

    private def raiseOrResumeCase(
      raiseCaseOp: RaiseCase,
      sfUpdateOp: (String, JsValue) => ClientFailableOp[Unit],
      raiseCaseDetail: RaiseCaseDetail
    )(
      sfContactId: ResponseWithId,
      sfSubscriptionIdContainer: ResponseWithId,
      sfRecentCases: GetMostRecentCaseByContactId.RecentCases
    ) = {
      if (sfRecentCases.records.isEmpty) // no recent cases so create one
        raiseCaseOp(buildNewCaseForSalesforce(raiseCaseDetail, sfSubscriptionIdContainer, sfContactId))
          .toApiGatewayOp("raise sf case")
      else // recent case exists, so just update the reason and return the case
        updateReasonOnRecentCase(sfUpdateOp)(raiseCaseDetail.reason, sfRecentCases.records.head)
          .toApiGatewayOp("update reason of recent sf case")
    }

    def steps(sfBackendForIdentityCookieHeader: SfBackendForIdentityCookieHeader)(apiGatewayRequest: ApiGatewayRequest) =
      (for {
        identityAndSfRequests <- sfBackendForIdentityCookieHeader(apiGatewayRequest.headers)
        raiseRequestBody <- apiGatewayRequest.bodyAsCaseClass[RaiseRequestBody]()
        raiseCaseDetail = RaiseCaseDetail(raiseRequestBody)
        lookupByIdOp = SalesforceGenericIdLookup(identityAndSfRequests.sfRequests)_
        mostRecentCaseOp = SalesforceCase.GetMostRecentCaseByContactId(identityAndSfRequests.sfRequests)_
        raiseCaseOp = SalesforceCase.Raise(identityAndSfRequests.sfRequests)_
        sfUpdateOp = SalesforceCase.Update(identityAndSfRequests.sfRequests)_
        raiseOrResumeCaseOp = raiseOrResumeCase(raiseCaseOp, sfUpdateOp, raiseCaseDetail)_
        wiredRaiseCase = raiseCase(lookupByIdOp, mostRecentCaseOp, raiseOrResumeCaseOp)_
        raiseCaseResponse <- wiredRaiseCase(identityAndSfRequests.identityUser.id, raiseCaseDetail.subscriptionName)
      } yield ApiGatewayResponse("200", raiseCaseResponse)).apiResponse
  }

  case class CasePathParams(caseId: String)
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

    case class CaseWithContactId(ContactId: String)
    implicit val caseReads: Reads[CaseWithContactId] = Json.reads[CaseWithContactId]

    def verifyCaseBelongsToUser(
      sfRequests: RestRequestMaker.Requests
    )(
      identityId: String,
      caseId: String
    ) =
      for {
        sfContactIdFromIdentity <- SalesforceGenericIdLookup(sfRequests)(SalesforceGenericIdLookupParams(
          sfObjectType = "Contact",
          fieldName = "IdentityID__c",
          lookupValue = identityId
        )).toApiGatewayOp("lookup SF contact ID from identityID")
        sfCaseDetail <- SalesforceCase.GetById[CaseWithContactId](sfRequests)(caseId)
          .toApiGatewayOp("lookup SF Case details")
        sfContactIdFromCase = sfCaseDetail.ContactId
        _ <- if (sfContactIdFromIdentity.Id equals sfContactIdFromCase) ContinueProcessing(())
        else ReturnWithResponse(ApiGatewayResponse.forbidden(
          s"Authenticated user (${sfContactIdFromIdentity.Id}) does not match ContactId ($sfContactIdFromCase) for Case ($caseId)"
        ))
      } yield ()

    def steps(sfBackendForIdentityCookieHeader: SfBackendForIdentityCookieHeader)(apiGatewayRequest: ApiGatewayRequest) =
      (for {
        identityAndSfRequests <- sfBackendForIdentityCookieHeader(apiGatewayRequest.headers)
        pathParams <- apiGatewayRequest.pathParamsAsCaseClass[CasePathParams]()
        _ <- verifyCaseBelongsToUser(identityAndSfRequests.sfRequests)(identityAndSfRequests.identityUser.id, pathParams.caseId)
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
