package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{MpapiConfig, SoftOptInError}
import io.circe.Decoder
import io.circe.parser.decode
import io.circe.generic.auto._
import scalaj.http.{Http, HttpResponse}

import scala.util.Try

case class MobileSubscriptions(subscriptions: List[MobileSubscription])
case class MobileSubscription(valid: Boolean)

class MpapiConnector(config: MpapiConfig) {

  def handleQueryResp[T: Decoder](
      response: Either[Throwable, HttpResponse[String]],
      errorDesc: String = "Decode error",
  ): Either[SoftOptInError, T] = {
    response.left
      .map(error => SoftOptInError(s"MpapiConnector: Mobile purchases API (MPAPI) query request failed: $error"))
      .flatMap { result =>
        decode[T](result.body).left.map(decodeError =>
          SoftOptInError(s"MpapiConnector: $errorDesc:$decodeError. String to decode ${result.body}"),
        )
      }
  }

  def getMobileSubscriptions(identityId: String): Either[SoftOptInError, MobileSubscriptions] = {
    handleQueryResp[MobileSubscriptions](
      sendReq(url = s"${config.mpapiUrl}/user/subscriptions/$identityId"),
      errorDesc = s"Mobile purchases API (MPAPI) request failed while processing $identityId",
    )
  }

  def sendReq(url: String): Either[Throwable, HttpResponse[String]] = {
    Try(
      Http(url)
        .header("Authorization", config.mpapiToken)
        .method("GET")
        .asString,
    ).toEither
  }

}
