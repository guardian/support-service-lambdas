package com.gu.cancellation.sf_cases

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.identity.IdentityCookieToIdentityId
import com.gu.salesforce.SalesforceGenericIdLookup
import com.gu.salesforce.SalesforceGenericIdLookup.ResponseWithId
import com.gu.salesforce.auth.SalesforceAuthenticate
import com.gu.salesforce.auth.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.cases.SalesforceCase
import com.gu.salesforce.cases.SalesforceCase.Raise.{NewCase, RaiseCaseResponse}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.{Config, LoadConfig, Stage}
import com.gu.util.reader.Types._
import com.gu.util.zuora.RestRequestMaker
import okhttp3.{Request, Response}
import play.api.libs.json.{JsValue, Json, Reads}
import scalaz.\/

object Handler extends Logging {

  case class StepsConfig(sfConfig: SFAuthConfig)
  implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

  type LazySalesforceAuthenticatedReqMaker = () => ApiGatewayOp[RestRequestMaker.Requests]

  def raiseCase(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(RaiseCase.steps, RawEffects.response, RawEffects.stage, RawEffects.s3Load, LambdaIO(inputStream, outputStream, context))

  object RaiseCase {

    case class RaiseRequestBody(
      product: String,
      reason: String,
      subscriptionName: String
    )
    implicit val reads = Json.reads[RaiseRequestBody]

    implicit val writes = Json.writes[RaiseCaseResponse]

    def embellishRaiseRequestBody(raiseRequestBody: RaiseRequestBody, sfSubscriptionIdContainer: ResponseWithId, sfContactId: ResponseWithId) = NewCase(
      Origin = "Self Service",
      ContactId = sfContactId.Id,
      Product__c = raiseRequestBody.product,
      SF_Subscription__c = sfSubscriptionIdContainer.Id,
      Journey__c = "SV - At Risk - MB",
      Enquiry_Type__c = raiseRequestBody.reason,
      Status = "Closed",
      Subject = "Online Cancellation Attempt"
    )

    def steps(sfRequests: LazySalesforceAuthenticatedReqMaker)(apiGatewayRequest: ApiGatewayRequest) =
      (for {
        identityId <- IdentityCookieToIdentityId(apiGatewayRequest.headers)
        sfRequests <- sfRequests()
        raiseCaseDetail <- apiGatewayRequest.bodyAsCaseClass[RaiseRequestBody]()
        sfContactId <- SalesforceGenericIdLookup(sfRequests)("Contact", "IdentityID__c", identityId).toApiGatewayOp("lookup SF contact from identityID")
        sfSubscriptionIdContainer <- SalesforceGenericIdLookup(sfRequests)("SF_Subscription__c", "Name", raiseCaseDetail.subscriptionName).toApiGatewayOp("lookup SF subscription ID")
        raiseCaseResponse <- SalesforceCase.Raise(sfRequests)(embellishRaiseRequestBody(raiseCaseDetail, sfSubscriptionIdContainer, sfContactId)).toApiGatewayOp("raise sf case")
      } yield ApiResponse("200", Json.prettyPrint(Json.toJson(raiseCaseResponse)))).apiResponse
  }

  def updateCase(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(UpdateCase.steps, RawEffects.response, RawEffects.stage, RawEffects.s3Load, LambdaIO(inputStream, outputStream, context))

  object UpdateCase {

    case class UpdateCasePathParams(caseId: String)
    implicit val pathParamReads = Json.reads[UpdateCasePathParams]

    def steps(sfRequests: LazySalesforceAuthenticatedReqMaker)(apiGatewayRequest: ApiGatewayRequest) =
      (for {
        _ <- IdentityCookieToIdentityId(apiGatewayRequest.headers) // TODO verify case belongs to identity user
        sfRequests <- sfRequests()
        pathParams <- apiGatewayRequest.pathParamsAsCaseClass[UpdateCasePathParams]()
        requestBody <- apiGatewayRequest.bodyAsCaseClass[JsValue]()
        _ <- SalesforceCase.Update(sfRequests)(pathParams.caseId, requestBody).toApiGatewayOp("update case")
      } yield ApiGatewayResponse.successfulExecution).apiResponse

  }

  def runWithEffects(steps: LazySalesforceAuthenticatedReqMaker => ApiGatewayRequest => ApiResponse, response: Request => Response, stage: Stage, s3Load: Stage => ConfigFailure \/ String, lambdaIO: LambdaIO) = {

    def operation: Config[StepsConfig] => Operation = config => {

      val sfRequests: LazySalesforceAuthenticatedReqMaker = () => SalesforceAuthenticate(response, config.stepsConfig.sfConfig)

      Operation.noHealthcheck(steps(sfRequests), shouldAuthenticate = false)

    }

    ApiGatewayHandler[StepsConfig](lambdaIO)(for {
      config <- LoadConfig.default[StepsConfig](implicitly)(stage, s3Load(stage)).toApiGatewayOp("load config")
      configuredOp = operation(config)
    } yield (config, configuredOp))

  }

}
