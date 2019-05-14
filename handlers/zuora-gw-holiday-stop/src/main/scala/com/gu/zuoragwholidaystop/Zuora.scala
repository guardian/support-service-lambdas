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

  def subscriptionGetResponse(
    zuoraAccess: ZuoraAccess
  )(subscriptionName: String): Either[String, Subscription] = {
    val request = sttp.auth
      .basic(zuoraAccess.username, zuoraAccess.password)
      .get(uri"${zuoraAccess.baseUrl}/subscriptions/$subscriptionName")
    val response = request.send()
    response.body.right flatMap { body =>
      normalised(decode[Subscription](body))
    }
  }

  def subscriptionUpdateResponse(zuoraAccess: ZuoraAccess)(
    subscriptionName: String,
    subscriptionUpdate: SubscriptionUpdate
  ): Either[String, ZuoraStatusResponse] = {
    val request = sttp.auth
      .basic(zuoraAccess.username, zuoraAccess.password)
      .put(uri"${zuoraAccess.baseUrl}/subscriptions/$subscriptionName")
      .body(subscriptionUpdate)
    val response = request.send()
    response.body.right flatMap { body =>
      normalised(decode[ZuoraStatusResponse](body))
    }
  }
}
