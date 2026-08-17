package com.gu.zuora

import com.gu.zuora.subscription._
import io.circe.generic.auto._
import sttp.client3._
import sttp.client3.circe._

import scala.concurrent.duration.DurationInt

case class ZuoraAccountMoveSubscriptionCommand(
    crmId: String,
    sfContactId__c: String,
    IdentityId__c: String,
)

case class MoveSubscriptionAtZuoraAccountResponse(message: String)

object Zuora {

  /** for legacy calls when Oauth is hardcoded to holidayStopProcessor and read from S3 file where holidayStopProcessor
    * is a field in json config *
    */
  def accessTokenGetResponse(
      config: HolidayStopProcessorZuoraConfig,
      backend: SttpBackend[Identity, Any],
  ): ZuoraApiResponse[AccessToken] = {
    val genericConfig = ZuoraRestOauthConfig(
      baseUrl = config.baseUrl,
      oauth = config.holidayStopProcessor.oauth,
    )
    accessTokenGetResponseV2(genericConfig, backend)
  }

  def accessTokenGetResponseV2(
      config: ZuoraRestOauthConfig,
      backend: SttpBackend[Identity, Any],
  ): ZuoraApiResponse[AccessToken] = {
    basicRequest
      .post(uri"${config.baseUrl.stripSuffix("/v1")}/oauth/token")
      .body(
        "grant_type" -> "client_credentials",
        "client_id" -> s"${config.oauth.clientId}",
        "client_secret" -> s"${config.oauth.clientSecret}",
      )
      .response(asJson[AccessToken])
      .mapResponse(_.left.map(e => ZuoraApiFailure(e.getMessage)))
      .send(backend)
      .body
  }

  def subscriptionGetResponse(config: ZuoraConfig, accessToken: AccessToken, backend: SttpBackend[Identity, Any])(
      subscriptionName: SubscriptionName,
  ): ZuoraApiResponse[Subscription] = {
    basicRequest
      .get(uri"${config.baseUrl}/subscriptions/${subscriptionName.value}")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .response(asJson[Subscription])
      .mapResponse(_.left.map(e => ZuoraApiFailure(e.getMessage)))
      .send(backend)
      .body
  }

  def accountGetResponse(
      config: ZuoraConfig,
      accessToken: AccessToken,
      backend: SttpBackend[Identity, Any],
  )(
      accountNumber: String,
  ): ZuoraApiResponse[ZuoraAccount] = {
    basicRequest
      .get(uri"${config.baseUrl}/accounts/$accountNumber")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .response(asJson[ZuoraAccount])
      .mapResponse(_.left.map(e => ZuoraApiFailure(e.getMessage)))
      .send(backend)
      .body
  }

  def updateAccountByMovingSubscription(
      config: ZuoraConfig,
      accessToken: AccessToken,
      backend: SttpBackend[Identity, Any],
  )(
      subscription: Subscription,
      updateCommandData: ZuoraAccountMoveSubscriptionCommand,
  ): ZuoraApiResponse[MoveSubscriptionAtZuoraAccountResponse] = {
    val errMsg = (reason: String) =>
      s"Failed to update subscription '${subscription.subscriptionNumber}' " +
        s"with $updateCommandData. Reason: $reason"
    basicRequest
      .readTimeout(2.minutes)
      .put(uri"${config.baseUrl}/accounts/${subscription.accountNumber}")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .body(updateCommandData)
      .response(asJson[ZuoraStatusResponse])
      .mapResponse {
        case Left(e) => Left(ZuoraApiFailure(errMsg(e.getMessage)))
        case Right(status) =>
          if (status.success) {
            Right(MoveSubscriptionAtZuoraAccountResponse("SUCCESS"))
          } else Left(ZuoraApiFailure(errMsg(status.reasons.map(_.mkString).getOrElse(""))))
      }
      .send(backend)
      .body

  }
}
