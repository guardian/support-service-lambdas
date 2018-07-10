package com.gu.cancellation.sf_cases

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.identity.{IdentityCookieToIdentityUser, IdentityTestUserConfig, IsIdentityTestUser}
import com.gu.identity.IdentityCookieToIdentityUser.IdentityUser
import com.gu.salesforce.SalesforceGenericIdLookup
import com.gu.salesforce.SalesforceGenericIdLookup.{ResponseWithId, TSalesforceGenericIdLookup}
import com.gu.salesforce.auth.SalesforceAuthenticate
import com.gu.salesforce.auth.SalesforceAuthenticate.SFAuthConfig
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
import play.api.libs.json.{JsValue, Json, Reads}

object Handler extends Logging {

  type LazySalesforceAuthenticatedReqMaker = () => ApiGatewayOp[RestRequestMaker.Requests]
  case class SfRequests(normal: LazySalesforceAuthenticatedReqMaker, test: LazySalesforceAuthenticatedReqMaker)

  def raiseCase(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(
      RaiseCase.steps(RawEffects.stage),
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

    def raiseCase(lookup: TSalesforceGenericIdLookup, raiseCase: RaiseCase)
                 (identityId: String, raiseCaseDetail: RaiseRequestBody) =
      for {
        sfContactId <- lookup("Contact", "IdentityID__c", identityId)
          .toApiGatewayOp("lookup SF contact from identityID")
        sfSubscriptionIdContainer <- lookup("SF_Subscription__c", "Name", raiseCaseDetail.subscriptionName)
          .toApiGatewayOp("lookup SF subscription ID")
        raiseCaseResponse <- raiseCase(buildNewCaseForSalesforce(raiseCaseDetail, sfSubscriptionIdContainer, sfContactId))
          .toApiGatewayOp("raise sf case")
      } yield raiseCaseResponse

    def steps(stage: Stage)
             (sfRequestsFollowingIdentityCheck: IdentityUser => ApiGatewayOp[RestRequestMaker.Requests])
             (apiGatewayRequest: ApiGatewayRequest) =
      (for {
        identityUser <- IdentityCookieToIdentityUser(apiGatewayRequest.headers, stage)
        sfRequests <- sfRequestsFollowingIdentityCheck(identityUser)
        raiseCaseDetail <- apiGatewayRequest.bodyAsCaseClass[RaiseRequestBody]()
        wiredRaiseCase = raiseCase(SalesforceGenericIdLookup(sfRequests), SalesforceCase.Raise(sfRequests))_
        raiseCaseResponse <- wiredRaiseCase(identityUser.id, raiseCaseDetail)
      } yield ApiResponse("200", Json.prettyPrint(Json.toJson(raiseCaseResponse)))).apiResponse
  }

  def updateCase(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(
      UpdateCase.steps(RawEffects.stage),
      RawEffects.response,
      RawEffects.stage,
      GetFromS3.fetchString,
      LambdaIO(inputStream, outputStream, context)
    )

  object UpdateCase {

    case class UpdateCasePathParams(caseId: String)
    implicit val pathParamReads = Json.reads[UpdateCasePathParams]

    def steps(stage: Stage)
             (sfRequestsFollowingIdentityCheck: IdentityUser => ApiGatewayOp[RestRequestMaker.Requests])
             (apiGatewayRequest: ApiGatewayRequest) =
      (for {
        identityUser <- IdentityCookieToIdentityUser(apiGatewayRequest.headers, stage)
        sfRequests <- sfRequestsFollowingIdentityCheck(identityUser)
        // TODO verify case belongs to identity user
        pathParams <- apiGatewayRequest.pathParamsAsCaseClass[UpdateCasePathParams]()
        requestBody <- apiGatewayRequest.bodyAsCaseClass[JsValue]()
        _ <- SalesforceCase.Update(sfRequests)(pathParams.caseId, requestBody).toApiGatewayOp("update case")
      } yield ApiGatewayResponse.successfulExecution).apiResponse

  }

  def runWithEffects(
    steps: (IdentityUser => ApiGatewayOp[RestRequestMaker.Requests]) => ApiGatewayRequest => ApiResponse,
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

      def sfRequestsFollowingIdentityCheck(identityUser: IdentityUser) =
        if (IsIdentityTestUser(identityTestUsersConfig)(identityUser)) sfRequestsTest() else sfRequestsNormal()

      Operation(
        steps(sfRequestsFollowingIdentityCheck),
        healthcheckSteps(SfRequests(sfRequestsNormal, sfRequestsTest)),
        shouldAuthenticate = false //TODO this could be removed when 'trustedApiConfig' is an Option
      )

    }

    def loadNormalSfConfig = loadConfig[SFAuthConfig]
    def loadTestSfConfig = {
      implicit val reads: Reads[SFAuthConfig] = SFAuthConfig.reads
      implicit val sfTestConfLocation: ConfigLocation[SFAuthConfig] = ConfigLocation[SFAuthConfig](path = "TEST/sfAuth", version = 1)
      loadConfig[SFAuthConfig]
    }

    def loadIdentityTestUsersConfig = {
      implicit val configReads: Reads[IdentityTestUserConfig] = Json.reads[IdentityTestUserConfig]
      implicit val configLocation = ConfigLocation[IdentityTestUserConfig](path = "identityTestUsers", version = 1)
      loadConfig[IdentityTestUserConfig]
    }

    ApiGatewayHandler(lambdaIO)(for {
      identityTestUsersConfig <- loadIdentityTestUsersConfig.toApiGatewayOp("load identity 'test-users' config")
      //TODO line below can be removed since 'shouldAuthenticate = false'
      trustedApiConfig <- loadConfig[TrustedApiConfig].toApiGatewayOp("load trusted api config")
      configuredOp = operation(identityTestUsersConfig)
    } yield (trustedApiConfig, configuredOp))

  }

}
