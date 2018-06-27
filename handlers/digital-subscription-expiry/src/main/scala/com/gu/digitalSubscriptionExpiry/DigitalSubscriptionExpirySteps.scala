package com.gu.digitalSubscriptionExpiry

import com.gu.digitalSubscriptionExpiry.responses.DigitalSubscriptionApiResponses
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.{AccountId, AccountSummaryResult}
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.{SubscriptionId, SubscriptionResult}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.reader.Types._
import main.scala.com.gu.digitalSubscriptionExpiry.DigitalSubscriptionExpiryRequest
import ApiGatewayOp.ContinueProcessing
import com.gu.util.apigateway.ResponseModels.ApiResponse
import play.api.libs.json.{JsResult, JsValue, Json, Reads}

case class UrlParams(noActivation: Boolean)
object UrlParams {

  case class UrlParamsWire(noActivation: String = "false") {
    def toUrlParams = UrlParams(noActivation == "true")
  }

  implicit val wireReads = Json.using[Json.WithDefaultValues].reads[UrlParamsWire]

  implicit val urlParamsReads = new Reads[UrlParams] {
    override def reads(json: JsValue): JsResult[UrlParams] = wireReads.reads(json).map(_.toUrlParams)
  }
}
object DigitalSubscriptionExpirySteps extends Logging {

  def apply(
    getEmergencyTokenExpiry: String => ApiGatewayOp[Unit],
    getSubscription: SubscriptionId => ApiGatewayOp[SubscriptionResult],
    getAccountSummary: AccountId => ApiGatewayOp[AccountSummaryResult],
    getSubscriptionExpiry: (String, SubscriptionResult, AccountSummaryResult) => ApiResponse,
    skipActivationDateUpdate: (UrlParams, SubscriptionResult) => Boolean,
    setActivationDate: SubscriptionId => ApiGatewayOp[Unit]
  ): Operation = {

    def steps(apiGatewayRequest: ApiGatewayRequest): ApiResponse = {
      (for {
        expiryRequest <- apiGatewayRequest.bodyAsCaseClass[DigitalSubscriptionExpiryRequest](DigitalSubscriptionApiResponses.badRequest)
        _ <- getEmergencyTokenExpiry(expiryRequest.subscriberId)
        subscriptionId = SubscriptionId(expiryRequest.subscriberId.trim.dropWhile(_ == '0'))
        subscriptionResult <- getSubscription(subscriptionId)
        queryStringParameters <- apiGatewayRequest.queryParamsAsCaseClass[UrlParams]()
        _ <- if (skipActivationDateUpdate(queryStringParameters, subscriptionResult))
          ContinueProcessing(())
        else
          setActivationDate(subscriptionResult.id)
        accountSummary <- getAccountSummary(subscriptionResult.accountId)
        password <- expiryRequest.password.toApiGatewayContinueProcessing(DigitalSubscriptionApiResponses.notFoundResponse)
        subscriptionEndDate = getSubscriptionExpiry(password, subscriptionResult, accountSummary)
      } yield subscriptionEndDate).apiResponse

    }
    Operation.noHealthcheck(steps, false)

  }

}

