package com.gu.zuoragwholidaystop

import com.softwaremill.sttp._
import com.softwaremill.sttp.circe._
import io.circe.generic.auto._
import io.circe.parser._

object Zuora {

  implicit val backend: SttpBackend[Id, Nothing] = HttpURLConnectionBackend()

  private def normalised[E <: io.circe.Error, R](
      result: Either[E, R]
  ): Either[String, R] = result.left.map(_.getMessage)

  def subscriptionGetResponse(zuoraUrl: String, bearerToken: String)(
      subscriptionName: String
  ): Either[String, Subscription] = {
    val request = sttp.auth
      .bearer(bearerToken)
      .get(uri"$zuoraUrl/v1/subscriptions/$subscriptionName")
    val response = request.send()
    response.body.right flatMap { body =>
      normalised(decode[Subscription](body))
    }
  }

  def subscriptionUpdateResponse(zuoraUrl: String, bearerToken: String)(
      subscriptionName: String,
      subscriptionUpdate: SubscriptionUpdate
  ): Either[String, ZuoraStatusResponse] = {
    val request = sttp.auth
      .bearer(bearerToken)
      .put(uri"$zuoraUrl/v1/subscriptions/$subscriptionName")
      .body(subscriptionUpdate)
    val response = request.send()
    response.body.right flatMap { body =>
      normalised(decode[ZuoraStatusResponse](body))
    }
  }
}
