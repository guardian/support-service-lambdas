package com.gu.holidaystopprocessor

import com.softwaremill.sttp._
import com.softwaremill.sttp.circe._
import io.circe.generic.auto._
import io.circe.parser._

object Zuora {

  implicit val backend: SttpBackend[Id, Nothing] = HttpURLConnectionBackend()

  private def normalised[E <: io.circe.Error, R](
    body: String, result: String => Either[E, R]
  ): Either[String, R] =
    result(body).left.map(e => s"Failed to decode '$body': ${e.toString}")

  def accessTokenGetResponse(config: ZuoraConfig): Either[OverallFailure, AccessToken] = {
    val authBaseUrl = config.baseUrl.stripSuffix("/v1")
    val url = uri"$authBaseUrl/oauth/token"
    val request = sttp.post(url)
      .body(
        "grant_type" -> "client_credentials",
        "client_id" -> s"${config.holidayStopProcessor.oauth.clientId}",
        "client_secret" -> s"${config.holidayStopProcessor.oauth.clientSecret}"
      )
    val response = request.send()
    for {
      body <- response.body.left.map(OverallFailure)
      token <- normalised(body, decode[AccessToken]).left.map(OverallFailure)
    } yield token
  }

  def subscriptionGetResponse(config: Config, accessToken: AccessToken)(subscriptionName: String): Either[HolidayStopFailure, Subscription] = {
    val url = uri"${config.zuoraConfig.baseUrl}/subscriptions/$subscriptionName"
    val request = sttp.get(url)
      .header("Authorization", s"Bearer $accessToken")
    val response = request.send()
    response.body.left map { e => HolidayStopFailure(e) } flatMap { body =>
      normalised(body, decode[Subscription]).left.map(HolidayStopFailure)
    }
    for {
      body <- response.body.left.map(HolidayStopFailure)
      subscription <- normalised(body, decode[Subscription]).left.map(HolidayStopFailure)
    } yield subscription
  }

  def subscriptionUpdateResponse(config: Config, accessToken: AccessToken)(subscription: Subscription, update: SubscriptionUpdate): Either[HolidayStopFailure, Unit] = {
    val url = uri"${config.zuoraConfig.baseUrl}/subscriptions/${subscription.subscriptionNumber}"
    val request = sttp.put(url)
      .header("Authorization", s"Bearer $accessToken")
      .body(update)
    val response = request.send()
    response.body.left map { e => HolidayStopFailure(e) } flatMap { body =>
      def failureMsg(wrappedMsg: String) =
        s"Update '$update' to subscription '${subscription.subscriptionNumber}' failed: $wrappedMsg"
      normalised(body, decode[ZuoraStatusResponse]) match {
        case Left(e) => Left(HolidayStopFailure(failureMsg(e)))
        case Right(status) =>
          if (!status.success)
            Left(HolidayStopFailure(failureMsg(status.reasons.map(_.mkString).getOrElse(""))))
          else Right(())
      }
    }
  }
}
