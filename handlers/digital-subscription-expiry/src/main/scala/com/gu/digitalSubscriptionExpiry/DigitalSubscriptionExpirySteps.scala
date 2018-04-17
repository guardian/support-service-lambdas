package com.gu.digitalSubscriptionExpiry

import java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME

import com.gu.digitalSubscriptionExpiry.common.CommonApiResponses._
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.{AccountId, AccountSummaryResult}
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.{SubscriptionId, SubscriptionResult}
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.SubscriptionId
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.reader.Types.FailableOp
import main.scala.com.gu.digitalSubscriptionExpiry.DigitalSubscriptionExpiryRequest
import java.time.{LocalDate, LocalDateTime}

import com.gu.util.reader.Types._
import play.api.libs.json.{JsValue, Json}

import scala.util.Try
object DigitalSubscriptionExpirySteps extends Logging {

  def parseJson(input: String): Option[JsValue] = Try(Json.parse(input)).toOption

  def apply(
    getEmergencyTokenExpiry: String => FailableOp[Unit],
    getSubscription: SubscriptionId => FailableOp[SubscriptionResult],
    getAccountSummary: AccountId => FailableOp[AccountSummaryResult],
    getSubscriptionExpiry: (String, SubscriptionResult, AccountSummaryResult, LocalDate) => FailableOp[Unit],
    updateSubscription: (SubscriptionResult, String) => FailableOp[Unit],
    today: LocalDate
  ): Operation = {

    def steps(apiGatewayRequest: ApiGatewayRequest): FailableOp[Unit] = {
      def skipActivation(apiGatewayRequest: ApiGatewayRequest) = apiGatewayRequest.queryStringParameters.map { _.noActivation }
      for {
        jsonRequest <- parseJson(apiGatewayRequest.body).toFailableOp(badRequest)
        expiryRequest <- Json.fromJson[DigitalSubscriptionExpiryRequest](jsonRequest).asOpt.toFailableOp(badRequest)
        _ <- getEmergencyTokenExpiry(expiryRequest.subscriberId)
        subscriptionId = SubscriptionId(expiryRequest.subscriberId)
        subscriptionResult <- getSubscription(subscriptionId)
        _ = if (skipActivation(apiGatewayRequest) != Some(true)) updateSubscription(subscriptionResult, LocalDateTime.now().format(ISO_LOCAL_DATE_TIME)) //TODO: trailing zeros??? and why can't this be a default param
        accountSummary <- getAccountSummary(subscriptionResult.accountId)
        password <- expiryRequest.password.toFailableOp(badRequest)
        subscriptionEndDate <- getSubscriptionExpiry(password, subscriptionResult, accountSummary, today)
      } yield {}

    }
    Operation.noHealthcheck(steps, false)

  }

}

