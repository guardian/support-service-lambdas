package com.gu.holiday_stops

import com.gu.zuora.subscription._
import com.softwaremill.sttp._
import com.softwaremill.sttp.circe._
import io.circe.generic.auto._

object Zuora {
  def accessTokenGetResponse(
    config: ZuoraConfig,
    backend: SttpBackend[Id, Nothing]
  ): ZuoraApiResponse[AccessToken] = {
    implicit val b = backend
    sttp.post(uri"${config.baseUrl.stripSuffix("/v1")}/oauth/token")
      .body(
        "grant_type" -> "client_credentials",
        "client_id" -> s"${config.holidayStopProcessor.oauth.clientId}",
        "client_secret" -> s"${config.holidayStopProcessor.oauth.clientSecret}"
      )
      .response(asJson[AccessToken])
      .mapResponse(_.left.map(e => ZuoraApiFailure(e.message)))
      .send()
      .body.left.map(e => ZuoraApiFailure(e))
      .joinRight
  }

  def subscriptionGetResponse(config: Config, accessToken: AccessToken, backend: SttpBackend[Id, Nothing])(subscriptionName: SubscriptionName): ZuoraApiResponse[Subscription] = {
    implicit val b = backend
    sttp.get(uri"${config.zuoraConfig.baseUrl}/subscriptions/${subscriptionName.value}")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .response(asJson[Subscription])
      .mapResponse(_.left.map(e => ZuoraApiFailure(e.message)))
      .send()
      .body.left.map(ZuoraApiFailure)
      .joinRight
  }

  def subscriptionUpdateResponse(config: Config, accessToken: AccessToken, backend: SttpBackend[Id, Nothing])(subscription: Subscription, update: SubscriptionUpdate): ZuoraApiResponse[Unit] = {
    implicit val b = backend
    val errMsg = (reason: String) => s"Failed to update subscription '${subscription.subscriptionNumber}' with $update. Reason: $reason"
    sttp.put(uri"${config.zuoraConfig.baseUrl}/subscriptions/${subscription.subscriptionNumber}")
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
}
