package com.gu.digitalSubscriptionExpiry

import com.gu.digitalSubscriptionExpiry.responses.DigitalSubscriptionApiResponses
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.{AccountId, AccountSummaryResult}
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.{SubscriptionId, SubscriptionResult}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.{ApiGatewayRequest, URLParams}
import com.gu.util.reader.Types._
import main.scala.com.gu.digitalSubscriptionExpiry.DigitalSubscriptionExpiryRequest
import scalaz.\/-

object DigitalSubscriptionExpirySteps extends Logging {

  def apply(
    getEmergencyTokenExpiry: String => FailableOp[Unit],
    getSubscription: SubscriptionId => FailableOp[SubscriptionResult],
    getAccountSummary: AccountId => FailableOp[AccountSummaryResult],
    getSubscriptionExpiry: (String, SubscriptionResult, AccountSummaryResult) => FailableOp[Unit],
    skipActivationDateUpdate: (Option[URLParams], SubscriptionResult) => Boolean,
    setActivationDate: (SubscriptionId) => FailableOp[Unit]
  ): Operation = {

    def steps(apiGatewayRequest: ApiGatewayRequest): FailableOp[Unit] = {
      for {
        expiryRequest <- apiGatewayRequest.bodyAsCaseClass[DigitalSubscriptionExpiryRequest](DigitalSubscriptionApiResponses.badRequest)
        _ <- getEmergencyTokenExpiry(expiryRequest.subscriberId)
        subscriptionId = SubscriptionId(expiryRequest.subscriberId.trim.dropWhile(_ == '0'))
        subscriptionResult <- getSubscription(subscriptionId)
        _ <- if (skipActivationDateUpdate(apiGatewayRequest.queryStringParameters, subscriptionResult)) \/-(()) else setActivationDate(subscriptionResult.id)
        accountSummary <- getAccountSummary(subscriptionResult.accountId)
        password <- expiryRequest.password.toFailableOp(DigitalSubscriptionApiResponses.notFoundResponse)
        subscriptionEndDate <- getSubscriptionExpiry(password, subscriptionResult, accountSummary)
      } yield {}

    }
    Operation.noHealthcheck(steps, false)

  }

}

