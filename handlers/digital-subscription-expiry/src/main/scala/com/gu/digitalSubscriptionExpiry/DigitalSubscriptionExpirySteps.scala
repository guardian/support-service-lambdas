package com.gu.digitalSubscriptionExpiry

import com.gu.digitalSubscriptionExpiry.responses.DigitalSubscriptionApiResponses
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.{AccountId, AccountSummaryResult}
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.{SubscriptionId, SubscriptionResult}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.{ApiGatewayRequest, URLParams}
import com.gu.util.reader.Types._
import main.scala.com.gu.digitalSubscriptionExpiry.DigitalSubscriptionExpiryRequest
import ApiGatewayOp.ContinueProcessing
import com.gu.util.apigateway.ResponseModels.ApiResponse

object DigitalSubscriptionExpirySteps extends Logging {

  def apply(
    getEmergencyTokenExpiry: String => ApiGatewayOp[Unit],
    getSubscription: SubscriptionId => ApiGatewayOp[SubscriptionResult],
    getAccountSummary: AccountId => ApiGatewayOp[AccountSummaryResult],
    getSubscriptionExpiry: (String, SubscriptionResult, AccountSummaryResult) => ApiResponse,
    skipActivationDateUpdate: (Option[URLParams], SubscriptionResult) => Boolean,
    setActivationDate: (SubscriptionId) => ApiGatewayOp[Unit]
  ): Operation = {

    def steps(apiGatewayRequest: ApiGatewayRequest): ApiGatewayOp[ApiResponse] = {
      for {
        expiryRequest <- apiGatewayRequest.bodyAsCaseClass[DigitalSubscriptionExpiryRequest](DigitalSubscriptionApiResponses.badRequest)
        _ <- getEmergencyTokenExpiry(expiryRequest.subscriberId)
        subscriptionId = SubscriptionId(expiryRequest.subscriberId.trim.dropWhile(_ == '0'))
        subscriptionResult <- getSubscription(subscriptionId)
        _ <- if (skipActivationDateUpdate(apiGatewayRequest.queryStringParameters, subscriptionResult)) ContinueProcessing(()) else setActivationDate(subscriptionResult.id)
        accountSummary <- getAccountSummary(subscriptionResult.accountId)
        password <- expiryRequest.password.toApiGatewayOp(DigitalSubscriptionApiResponses.notFoundResponse)
        subscriptionEndDate = getSubscriptionExpiry(password, subscriptionResult, accountSummary)
      } yield subscriptionEndDate

    }
    Operation.noHealthcheck((steps _).andThen(_.apiResponse), false)

  }

}

