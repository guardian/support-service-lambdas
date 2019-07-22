package com.gu.holidaystopprocessor

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.SubscriptionName
import com.softwaremill.sttp._
import com.softwaremill.sttp.circe._
import io.circe.generic.auto._

object Zuora {

  implicit val backend: SttpBackend[Id, Nothing] = HttpURLConnectionBackend()

  def accessTokenGetResponse(config: ZuoraConfig): Either[OverallFailure, AccessToken] = {
    sttp.post(uri"${config.baseUrl.stripSuffix("/v1")}/oauth/token")
      .body(
        "grant_type" -> "client_credentials",
        "client_id" -> s"${config.holidayStopProcessor.oauth.clientId}",
        "client_secret" -> s"${config.holidayStopProcessor.oauth.clientSecret}"
      )
      .response(asJson[AccessToken])
      .mapResponse(_.left.map(e => OverallFailure(e.message)))
      .send()
      .body.left.map(OverallFailure)
      .joinRight
  }

  def subscriptionGetResponse(config: Config, accessToken: AccessToken)(subscriptionName: SubscriptionName): Either[HolidayStopFailure, Subscription] = {
    sttp.get(uri"${config.zuoraConfig.baseUrl}/subscriptions/${subscriptionName.value}")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .response(asJson[Subscription])
      .mapResponse(_.left.map(e => HolidayStopFailure(e.message)))
      .send()
      .body.left.map(HolidayStopFailure)
      .joinRight
  }

  def subscriptionUpdateResponse(config: Config, accessToken: AccessToken)(subscription: Subscription, update: SubscriptionUpdate): Either[HolidayStopFailure, Unit] = {
    val errMsg = (reason: String) => s"Failed to update subscription '${subscription.subscriptionNumber}' with $update. Reason: $reason"
    sttp.put(uri"${config.zuoraConfig.baseUrl}/subscriptions/${subscription.subscriptionNumber}")
      .header("Authorization", s"Bearer ${accessToken.access_token}")
      .body(update)
      .response(asJson[ZuoraStatusResponse])
      .mapResponse {
        case Left(e) => Left(HolidayStopFailure(errMsg(e.message)))
        case Right(status) =>
          if (status.success) Right(())
          else Left(HolidayStopFailure(errMsg(status.reasons.map(_.mkString).getOrElse(""))))
      }
      .send()
      .body.left.map(reason => HolidayStopFailure(errMsg(reason)))
      .joinRight
  }
}
