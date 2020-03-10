package com.gu.zuora

import com.gu.zuora.subscription._
import com.softwaremill.sttp._
import com.softwaremill.sttp.circe._
import io.circe.generic.auto._

object Zuora {

  /**
   * for legacy calls when Oauth is hardcoded to holidayStopProcessor
   * and read from S3 file where holidayStopProcessor is a field in json config
   * **/
  def accessTokenGetResponse(
                              config: HolidayStopProcessorZuoraConfig,
                              backend: SttpBackend[Id, Nothing]
  ): ZuoraApiResponse[AccessToken] = {
    val genericConfig = ZuoraRestOauthConfig(
      baseUrl = config.baseUrl,
      oauth = config.holidayStopProcessor.oauth
    )
    accessTokenGetResponse(genericConfig, backend)
  }

  def accessTokenGetResponse(
    config: ZuoraRestOauthConfig,
    backend: SttpBackend[Id, Nothing]
  ): ZuoraApiResponse[AccessToken] = {
    implicit val b: SttpBackend[Id, Nothing] = backend
    sttp.post(uri"${config.baseUrl.stripSuffix("/v1")}/oauth/token")
      .body(
        "grant_type" -> "client_credentials",
        "client_id" -> s"${config.oauth.clientId}",
        "client_secret" -> s"${config.oauth.clientSecret}"
      )
      .response(asJson[AccessToken])
      .mapResponse(_.left.map(e => ZuoraApiFailure(e.message)))
      .send()
      .body.left.map(e => ZuoraApiFailure(e))
      .joinRight
  }

  def subscriptionGetResponse(config: ZuoraConfig, accessToken: AccessToken, backend: SttpBackend[Id, Nothing])(subscriptionName: SubscriptionName): ZuoraApiResponse[Subscription] = {
    implicit val b: SttpBackend[Id, Nothing] = backend
    sttp.get(uri"${config.baseUrl}/subscriptions/${subscriptionName.value}")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .response(asJson[Subscription])
      .mapResponse(_.left.map(e => ZuoraApiFailure(e.message)))
      .send()
      .body.left.map(ZuoraApiFailure)
      .joinRight
  }

  def subscriptionUpdateResponse(config: ZuoraConfig, accessToken: AccessToken, backend: SttpBackend[Id, Nothing])(subscription: Subscription, update: SubscriptionUpdate): ZuoraApiResponse[Unit] = {
    implicit val b: SttpBackend[Id, Nothing] = backend
    val errMsg = (reason: String) => s"Failed to update subscription '${subscription.subscriptionNumber}' with $update. Reason: $reason"
    sttp.put(uri"${config.baseUrl}/subscriptions/${subscription.subscriptionNumber}")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .body(update)
      .response(asJson[ZuoraStatusResponse])
      .mapResponse {
        case Left(e) => Left(ZuoraApiFailure(errMsg(e.message)))
        case Right(status) =>
          if (status.success) Right(())
          else Left(ZuoraApiFailure(errMsg(status.reasons.map(_.mkString).getOrElse(""))))
      }
      .send()
      .body.left.map(reason => ZuoraApiFailure(errMsg(reason)))
      .joinRight
  }

  def accountGetResponse(
                          config: ZuoraConfig,
                          accessToken: AccessToken,
                          backend: SttpBackend[Id, Nothing]
  )(
    accountNumber: String
  ): ZuoraApiResponse[ZuoraAccount] = {
    implicit val b = backend
    sttp.get(uri"${config.baseUrl}/accounts/$accountNumber")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .response(asJson[ZuoraAccount])
      .mapResponse(_.left.map(e => ZuoraApiFailure(e.message)))
      .send()
      .body.left.map(ZuoraApiFailure)
      .joinRight
  }

}
