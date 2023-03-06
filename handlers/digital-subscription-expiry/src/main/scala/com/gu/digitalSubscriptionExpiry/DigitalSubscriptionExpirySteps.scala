package com.gu.digitalSubscriptionExpiry

import com.gu.digitalSubscriptionExpiry.responses.DigitalSubscriptionApiResponses
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.{AccountId, AccountSummaryResult}
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.{SubscriptionId, SubscriptionResult}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.reader.Types._
import play.api.libs.json.{Json, Reads}

case class UrlParams(noActivation: Boolean)
object UrlParams {

  case class UrlParamsWire(noActivation: Option[String]) {
    def toUrlParams = UrlParams(noActivation.contains("true"))
  }
  val wireReads = Json.reads[UrlParamsWire]
  implicit val urlParamsReads: Reads[UrlParams] = json => wireReads.reads(json).map(_.toUrlParams)
}
object DigitalSubscriptionExpirySteps extends Logging {

  def apply(
      getEmergencyTokenExpiry: String => ApiGatewayOp[Unit],
      getSubscription: SubscriptionId => ApiGatewayOp[SubscriptionResult],
      getAccountSummary: AccountId => ApiGatewayOp[AccountSummaryResult],
      getSubscriptionExpiry: (String, SubscriptionResult, AccountSummaryResult) => ApiResponse,
      skipActivationDateUpdate: (UrlParams, SubscriptionResult) => Boolean,
      setActivationDate: SubscriptionId => ApiGatewayOp[Unit],
  ): Operation = {

    def steps(apiGatewayRequest: ApiGatewayRequest): ApiResponse = {
      (for {
        expiryRequest <- apiGatewayRequest.bodyAsCaseClass[DigitalSubscriptionExpiryRequest](
          Some(DigitalSubscriptionApiResponses.badRequest),
        )
        _ <- getEmergencyTokenExpiry(expiryRequest.subscriberId)
        subscriptionId = SubscriptionId(expiryRequest.subscriberId.trim.dropWhile(_ == '0'))
        subscriptionResult <- getSubscription(subscriptionId)
        queryStringParameters <- apiGatewayRequest.queryParamsAsCaseClass[UrlParams]()
        _ <-
          if (skipActivationDateUpdate(queryStringParameters, subscriptionResult))
            ContinueProcessing(())
          else
            setActivationDate(subscriptionResult.id)
        accountSummary <- getAccountSummary(subscriptionResult.accountId)
        _ = {
          if (accountSummary.identityId.isDefined) {
            logger.info("User has identityId")
          } else {
            logger.info("User doesn't have a linked identityId")
          }
        }
        password <- expiryRequest.password.toApiGatewayContinueProcessing(
          DigitalSubscriptionApiResponses.notFoundResponse,
        )
        subscriptionEndDate = getSubscriptionExpiry(password, subscriptionResult, accountSummary)
      } yield subscriptionEndDate).apiResponse

    }
    Operation.noHealthcheck(steps)

  }

}
