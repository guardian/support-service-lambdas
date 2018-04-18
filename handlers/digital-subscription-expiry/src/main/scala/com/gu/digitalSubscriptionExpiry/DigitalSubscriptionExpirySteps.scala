package com.gu.digitalSubscriptionExpiry

import java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME

import com.gu.digitalSubscriptionExpiry.common.CommonApiResponses._
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.{AccountId, AccountSummaryResult}
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.{SubscriptionId, SubscriptionResult}
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.SubscriptionId
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.{ApiGatewayRequest, URLParams}
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
    skipActivationDateUpdate: (Option[URLParams], SubscriptionResult) => Boolean,
    updateSubscription: (SubscriptionResult, String) => FailableOp[Unit],
    today: LocalDate
  ): Operation = {

    def steps(apiGatewayRequest: ApiGatewayRequest): FailableOp[Unit] = {
      val nowAsString = LocalDateTime.now().format(ISO_LOCAL_DATE_TIME)
      for {
        jsonRequest <- parseJson(apiGatewayRequest.body).toFailableOp(badRequest)
        expiryRequest <- Json.fromJson[DigitalSubscriptionExpiryRequest](jsonRequest).asOpt.toFailableOp(badRequest)
        _ <- getEmergencyTokenExpiry(expiryRequest.subscriberId)
        subscriptionId = SubscriptionId(expiryRequest.subscriberId.trim.dropWhile(_ == '0'))
        subscriptionResult <- getSubscription(subscriptionId)
        _ = if (skipActivationDateUpdate(apiGatewayRequest.queryStringParameters, subscriptionResult)) updateSubscription(subscriptionResult, nowAsString)
        accountSummary <- getAccountSummary(subscriptionResult.accountId)
        password <- expiryRequest.password.toFailableOp(notFoundResponse)
        subscriptionEndDate <- getSubscriptionExpiry(password, subscriptionResult, accountSummary, today)
      } yield {}

    }
    Operation.noHealthcheck(steps, false)

  }

}

