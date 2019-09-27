package com.gu.holiday_stops

import com.gu.holiday_stops.subscription.{HolidayCreditUpdate, Subscription}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.SubscriptionName
import com.softwaremill.sttp._
import com.softwaremill.sttp.circe._
import io.circe.generic.auto._

object Zuora {
  def accessTokenGetResponse(
    config: ZuoraConfig,
    backend: SttpBackend[Id, Nothing]
  ): ZuoraHolidayResponse[AccessToken] = {
    implicit val b = backend
    sttp.post(uri"${config.baseUrl.stripSuffix("/v1")}/oauth/token")
      .body(
        "grant_type" -> "client_credentials",
        "client_id" -> s"${config.holidayStopProcessor.oauth.clientId}",
        "client_secret" -> s"${config.holidayStopProcessor.oauth.clientSecret}"
      )
      .response(asJson[AccessToken])
      .mapResponse(_.left.map(e => ZuoraHolidayError(e.message)))
      .send()
      .body.left.map(e => ZuoraHolidayError(e))
      .joinRight
  }

  def subscriptionGetResponse(config: Config, accessToken: AccessToken, backend: SttpBackend[Id, Nothing])(subscriptionName: SubscriptionName): Either[ZuoraHolidayError, Subscription] = {
    implicit val b = backend
    sttp.get(uri"${config.zuoraConfig.baseUrl}/subscriptions/${subscriptionName.value}")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .response(asJson[Subscription])
      .mapResponse(_.left.map(e => ZuoraHolidayError(e.message)))
      .send()
      .body.left.map(ZuoraHolidayError)
      .joinRight
  }

  def subscriptionUpdateResponse(config: Config, accessToken: AccessToken, backend: SttpBackend[Id, Nothing])(subscription: Subscription, update: HolidayCreditUpdate): Either[ZuoraHolidayError, Unit] = {
    implicit val b = backend
    val errMsg = (reason: String) => s"Failed to update subscription '${subscription.subscriptionNumber}' with $update. Reason: $reason"
    sttp.put(uri"${config.zuoraConfig.baseUrl}/subscriptions/${subscription.subscriptionNumber}")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .body(update)
      .response(asJson[ZuoraStatusResponse])
      .mapResponse {
        case Left(e) => Left(ZuoraHolidayError(errMsg(e.message)))
        case Right(status) =>
          if (status.success) Right(())
          else Left(ZuoraHolidayError(errMsg(status.reasons.map(_.mkString).getOrElse(""))))
      }
      .send()
      .body.left.map(reason => ZuoraHolidayError(errMsg(reason)))
      .joinRight
  }
}
