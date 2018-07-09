package com.gu.cancellation.sf_cases

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.identity.IdentityCookieToIdentityId
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
import com.gu.util.config.{LoadConfigModule, Stage, TrustedApiConfig}
import com.gu.util.reader.Types._
import com.gu.util.zuora.RestRequestMaker
import okhttp3.{Request, Response}
import play.api.libs.json.{JsValue, Json}

object Handler extends Logging {

  type LazySalesforceAuthenticatedReqMaker = () => ApiGatewayOp[RestRequestMaker.Requests]

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

    def raiseCase(lookup: TSalesforceGenericIdLookup, raiseCase: RaiseCase)(identityId: String, raiseCaseDetail: RaiseRequestBody) =
      for {
        sfContactId <- lookup("Contact", "IdentityID__c", identityId)
          .toApiGatewayOp("lookup SF contact from identityID")
        sfSubscriptionIdContainer <- lookup("SF_Subscription__c", "Name", raiseCaseDetail.subscriptionName)
          .toApiGatewayOp("lookup SF subscription ID")
        raiseCaseResponse <- raiseCase(buildNewCaseForSalesforce(raiseCaseDetail, sfSubscriptionIdContainer, sfContactId))
          .toApiGatewayOp("raise sf case")
      } yield raiseCaseResponse

    def steps(stage: Stage)(sfRequests: LazySalesforceAuthenticatedReqMaker)(apiGatewayRequest: ApiGatewayRequest) =
      (for {
        identityId <- IdentityCookieToIdentityId(apiGatewayRequest.headers, stage)
        sfRequests <- sfRequests()
        raiseCaseDetail <- apiGatewayRequest.bodyAsCaseClass[RaiseRequestBody]()
        wiredRaiseCase = raiseCase(SalesforceGenericIdLookup(sfRequests), SalesforceCase.Raise(sfRequests)) _
        raiseCaseResponse <- wiredRaiseCase(identityId, raiseCaseDetail)
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

    def steps(stage: Stage)(sfRequests: LazySalesforceAuthenticatedReqMaker)(apiGatewayRequest: ApiGatewayRequest) =
      (for {
        _ <- IdentityCookieToIdentityId(apiGatewayRequest.headers, stage) // TODO verify case belongs to identity user
        sfRequests <- sfRequests()
        pathParams <- apiGatewayRequest.pathParamsAsCaseClass[UpdateCasePathParams]()
        requestBody <- apiGatewayRequest.bodyAsCaseClass[JsValue]()
        _ <- SalesforceCase.Update(sfRequests)(pathParams.caseId, requestBody).toApiGatewayOp("update case")
      } yield ApiGatewayResponse.successfulExecution).apiResponse

  }

  def runWithEffects(
    steps: LazySalesforceAuthenticatedReqMaker => ApiGatewayRequest => ApiResponse,
    response: Request => Response,
    stage: Stage,
    fetchString: StringFromS3,
    lambdaIO: LambdaIO
  ) = {

    def healthcheckSteps(sfRequests: LazySalesforceAuthenticatedReqMaker) = () =>
      (for { _ <- sfRequests() } yield ApiGatewayResponse.successfulExecution).apiResponse

    def operation: SFAuthConfig => Operation = sfConfig => {

      val sfRequests: LazySalesforceAuthenticatedReqMaker = () => SalesforceAuthenticate(response, sfConfig)

      Operation(
        steps(sfRequests),
        healthcheckSteps(sfRequests),
        shouldAuthenticate = false
      )

    }

    val loadConfig = LoadConfigModule(stage, fetchString)

    ApiGatewayHandler(lambdaIO)(for {
      sfConfig <- loadConfig[SFAuthConfig].toApiGatewayOp("load sf config")
      trustedApiConfig <- loadConfig[TrustedApiConfig].toApiGatewayOp("load trusted api config")
      configuredOp = operation(sfConfig)
    } yield (trustedApiConfig, configuredOp))

  }

}
