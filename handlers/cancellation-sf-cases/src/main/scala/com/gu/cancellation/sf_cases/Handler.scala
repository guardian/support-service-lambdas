package com.gu.cancellation.sf_cases

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.identity.IdentityCookieToIdentityUser.{CookieValuesToIdentityUser, IdentityUser}
import com.gu.identity.{IdentityCookieToIdentityUser, IdentityTestUserConfig, IsIdentityTestUser}
import com.gu.salesforce.SalesforceGenericIdLookup
import com.gu.salesforce.SalesforceGenericIdLookup.{ResponseWithId, TSalesforceGenericIdLookup}
import com.gu.salesforce.auth.SalesforceAuthenticate
import com.gu.salesforce.auth.SalesforceAuthenticate.{SFAuthConfig, SFAuthTestConfig}
import com.gu.salesforce.cases.SalesforceCase
import com.gu.salesforce.cases.SalesforceCase.Raise.{NewCase, RaiseCase, RaiseCaseResponse}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config._
import com.gu.util.reader.Types._
import com.gu.util.zuora.RestRequestMaker
import okhttp3.{Request, Response}
import play.api.libs.json.{JsValue, Json}

object Handler extends Logging {

  case class IdentityAndSfRequests(identityUser: IdentityUser, sfRequests: RestRequestMaker.Requests)

  type HeadersOption = Option[Map[String, String]]
  type IdentityAndSfRequestsApiGatewayOp = ApiGatewayOp[IdentityAndSfRequests]
  type HeadersToIdentityAndSfRequests = HeadersOption => IdentityAndSfRequestsApiGatewayOp
  type Steps = HeadersToIdentityAndSfRequests => ApiGatewayRequest => ApiResponse
  type LazySalesforceAuthenticatedReqMaker = () => ApiGatewayOp[RestRequestMaker.Requests]
  case class SfRequests(normal: LazySalesforceAuthenticatedReqMaker, test: LazySalesforceAuthenticatedReqMaker)

  def raiseCase(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(
      IdentityCookieToIdentityUser.defaultCookiesToIdentityUser(RawEffects.stage.isProd),
      RaiseCase.steps,
      RawEffects.response,
      RawEffects.stage,
      GetFromS3.fetchString,
      LambdaIO(inputStream, outputStream, context)
    )

  object RaiseCase {

    case class RaiseRequestBody(
      product: String,
      reason: String,
      subscriptionName: String
    )
    implicit val reads = Json.reads[RaiseRequestBody]
    implicit val writes = Json.writes[RaiseCaseResponse]

    def buildNewCaseForSalesforce(
      raiseRequestBody: RaiseRequestBody,
      sfSubscriptionIdContainer: ResponseWithId,
      sfContactIdContainer: ResponseWithId
    ) =
      NewCase(
        Origin = "Self Service",
        ContactId = sfContactIdContainer.Id,
        Product__c = raiseRequestBody.product,
        SF_Subscription__c = sfSubscriptionIdContainer.Id,
        Journey__c = "SV - At Risk - MB",
        Enquiry_Type__c = raiseRequestBody.reason,
        Status = "Closed",
        Subject = "Online Cancellation Attempt"
      )

    def raiseCase(
      lookup: TSalesforceGenericIdLookup,
      raiseCase: RaiseCase
    )(
      identityId: String,
      raiseCaseDetail: RaiseRequestBody
    ) =
      for {
        sfContactId <- lookup("Contact", "IdentityID__c", identityId)
          .toApiGatewayOp("lookup SF contact from identityID")
        sfSubscriptionIdContainer <- lookup("SF_Subscription__c", "Name", raiseCaseDetail.subscriptionName)
          .toApiGatewayOp("lookup SF subscription ID")
        raiseCaseResponse <- raiseCase(buildNewCaseForSalesforce(raiseCaseDetail, sfSubscriptionIdContainer, sfContactId))
          .toApiGatewayOp("raise sf case")
      } yield raiseCaseResponse

    def steps(headersToIdentityAndSfRequests: HeadersToIdentityAndSfRequests)(apiGatewayRequest: ApiGatewayRequest) =
      (for {
        identityAndSfRequests <- headersToIdentityAndSfRequests(apiGatewayRequest.headers)
        raiseCaseDetail <- apiGatewayRequest.bodyAsCaseClass[RaiseRequestBody]()
        lookupOp = SalesforceGenericIdLookup(identityAndSfRequests.sfRequests)_
        raiseOp = SalesforceCase.Raise(identityAndSfRequests.sfRequests)_
        wiredRaiseCase = raiseCase(lookupOp, raiseOp)_
        raiseCaseResponse <- wiredRaiseCase(identityAndSfRequests.identityUser.id, raiseCaseDetail)
      } yield ApiResponse("200", Json.prettyPrint(Json.toJson(raiseCaseResponse)))).apiResponse
  }

  case class CasePathParams(caseId: String)
  implicit val pathParamReads = Json.reads[CasePathParams]

  def updateCase(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(
      IdentityCookieToIdentityUser.defaultCookiesToIdentityUser(RawEffects.stage.isProd),
      UpdateCase.steps,
      RawEffects.response,
      RawEffects.stage,
      GetFromS3.fetchString,
      LambdaIO(inputStream, outputStream, context)
    )

  object UpdateCase {

    def steps(headersToIdentityAndSfRequests: HeadersToIdentityAndSfRequests)(apiGatewayRequest: ApiGatewayRequest) =
      (for {
        identityAndSfRequests <- headersToIdentityAndSfRequests(apiGatewayRequest.headers)
        // TODO verify case belongs to identity user
        pathParams <- apiGatewayRequest.pathParamsAsCaseClass[CasePathParams]()
        requestBody <- apiGatewayRequest.bodyAsCaseClass[JsValue]()
        sfUpdate = SalesforceCase.Update(identityAndSfRequests.sfRequests)_
        _ <- sfUpdate(pathParams.caseId, requestBody).toApiGatewayOp("update case")
      } yield ApiGatewayResponse.successfulExecution).apiResponse

  }

  // CURRENTLY NO API GATEWAY CONFIGURED FOR THIS
  def getCase(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(
      IdentityCookieToIdentityUser.defaultCookiesToIdentityUser(RawEffects.stage.isProd),
      GetCase.steps,
      RawEffects.response,
      RawEffects.stage,
      GetFromS3.fetchString,
      LambdaIO(inputStream, outputStream, context)
    )

  object GetCase {

    def steps(headersToIdentityAndSfRequests: HeadersToIdentityAndSfRequests)(apiGatewayRequest: ApiGatewayRequest) =
      (for {
        identityAndSfRequests <- headersToIdentityAndSfRequests(apiGatewayRequest.headers)
        // TODO verify case belongs to identity user
        pathParams <- apiGatewayRequest.pathParamsAsCaseClass[CasePathParams]()
        sfGet = SalesforceCase.GetById(identityAndSfRequests.sfRequests)_
        getCaseResponse <- sfGet(pathParams.caseId).toApiGatewayOp("get case detail")
      } yield ApiResponse("200", Json.prettyPrint(Json.toJson(getCaseResponse)))).apiResponse

  }

  def runWithEffects(
    cookieValuesToIdentityUser: CookieValuesToIdentityUser,
    steps: Steps,
    response: Request => Response,
    stage: Stage,
    fetchString: StringFromS3,
    lambdaIO: LambdaIO
  ) = {

    val loadConfig = LoadConfigModule(stage, fetchString)

    def healthcheckSteps(sfRequests: SfRequests) = () =>
      (for {
        _ <- sfRequests.normal()
        _ <- sfRequests.test()
      } yield ApiGatewayResponse.successfulExecution).apiResponse

    def operation(identityTestUsersConfig: IdentityTestUserConfig): Operation = {

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

      def headersToIdentityAndSfRequests(headers: HeadersOption): IdentityAndSfRequestsApiGatewayOp = {
        for {
          identityUser <- IdentityCookieToIdentityUser(cookieValuesToIdentityUser)(headers)
          sfRequests <- if (IsIdentityTestUser(identityTestUsersConfig)(identityUser)) sfRequestsTest() else sfRequestsNormal()
        } yield IdentityAndSfRequests(identityUser, sfRequests)
      }

      Operation(
        steps(headersToIdentityAndSfRequests),
        healthcheckSteps(SfRequests(sfRequestsNormal, sfRequestsTest)),
        shouldAuthenticate = false //TODO this could be removed when 'trustedApiConfig' is an Option
      )

    }

    def loadNormalSfConfig = loadConfig[SFAuthConfig](SFAuthConfig.location, SFAuthConfig.reads)
    def loadTestSfConfig = loadConfig[SFAuthConfig](SFAuthTestConfig.location, SFAuthTestConfig.reads)

    ApiGatewayHandler(lambdaIO)(for {
      identityTestUsersConfig <- loadConfig[IdentityTestUserConfig].toApiGatewayOp("load identity 'test-users' config")
      //TODO line below can be removed since 'shouldAuthenticate = false'
      trustedApiConfig <- loadConfig[TrustedApiConfig].toApiGatewayOp("load trusted api config")
      configuredOp = operation(identityTestUsersConfig)
    } yield (trustedApiConfig, configuredOp))

  }

}
