package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{IdentityConfig, SoftOptInError}
import scalaj.http.{Http, HttpResponse}
import scala.util.Try
import com.typesafe.scalalogging.LazyLogging

class IdentityConnector(config: IdentityConfig) extends LazyLogging {

  def sendConsentsReq(identityId: String, body: String): Either[SoftOptInError, Unit] = {
    handleConsentsResp(
      sendReq(url = s"${config.identityUrl}/users/$identityId/consents", body),
      errorDesc = s"Identity request failed while processing $identityId with body $body",
    )
  }

  def sendReq(url: String, body: String): Either[Throwable, HttpResponse[String]] = {
    logger.info(s"consents update request: url: ${url}, body: ${body}")
    Try(
      Http(url)
        .header("Content-Type", "application/json")
        .header("Authorization", s"Bearer ${config.identityToken}")
        .postData(body)
        .method("PATCH")
        .asString,
    ).toEither
  }

  def handleConsentsResp(
      response: Either[Throwable, HttpResponse[String]],
      errorDesc: String = "",
  ): Either[SoftOptInError, Unit] = {
    response.left
      .map(i => SoftOptInError(s"IdentityConnector: Identity request failed: $i"))
      .flatMap { response =>
        if (response.isSuccess)
          Right(())
        else
          Left(SoftOptInError(s"IdentityConnector $errorDesc. Status code: ${response.code}"))
      }
  }

}
