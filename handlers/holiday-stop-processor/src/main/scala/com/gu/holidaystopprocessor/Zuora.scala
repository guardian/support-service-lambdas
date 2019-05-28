package com.gu.holidaystopprocessor

import com.softwaremill.sttp._
import com.softwaremill.sttp.circe._
import io.circe.generic.auto._
import io.circe.parser._

object Zuora {

  implicit val backend: SttpBackend[Id, Nothing] = HttpURLConnectionBackend()

  private def normalised[E <: io.circe.Error, R](
    body: String, result: String => Either[E, R]
  ): Either[String, R] = result(body).left.map(e => s"Failed to decode '$body': ${e.toString}")

  def subscriptionGetResponse(
    zuoraAccess: ZuoraAccess
  )(subscriptionName: String): Either[String, Subscription] = {
    val request = sttp.auth
      .basic(zuoraAccess.username, zuoraAccess.password)
      .get(uri"${zuoraAccess.baseUrl}/subscriptions/$subscriptionName")
    val response = request.send()
    response.body flatMap { body =>
      normalised(body, decode[Subscription])
    }
  }

  def subscriptionUpdateResponse(zuoraAccess: ZuoraAccess)(
    subscription: Subscription,
    update: SubscriptionUpdate
  ): Either[String, Unit] = {
    val request = sttp.auth
      .basic(zuoraAccess.username, zuoraAccess.password)
      .put(uri"${zuoraAccess.baseUrl}/subscriptions/${subscription.subscriptionNumber}")
      .body(update)
    val response = request.send()
    response.body flatMap { body =>
      def failureMsg(wrappedMsg: String) = s"Update '$update' to subscription '${subscription.subscriptionNumber}' failed: $wrappedMsg"
      normalised(body, decode[ZuoraStatusResponse]) match {
        case Left(e) => Left(failureMsg(e))
        case Right(status) =>
          if (!status.success)
            Left(failureMsg(status.reasons.map(_.mkString).getOrElse("")))
          else Right(Unit)
      }
    }
  }

  def lastAmendmentGetResponse(zuoraAccess: ZuoraAccess)(subscription: Subscription): Either[String, Amendment] = {
    val request = sttp.auth
      .basic(zuoraAccess.username, zuoraAccess.password)
      .get(uri"${zuoraAccess.baseUrl}/amendments/subscriptions/${subscription.subscriptionNumber}")
    val response = request.send()
    response.body flatMap { body =>
      normalised(body, decode[Amendment])
    }
  }
}
