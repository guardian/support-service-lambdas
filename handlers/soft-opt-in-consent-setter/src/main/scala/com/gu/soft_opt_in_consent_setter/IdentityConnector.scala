package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{IdapiUserResponse, IdentityConfig, SoftOptInError}
import scalaj.http.{Http, HttpResponse}

import scala.util.Try
import io.circe.Decoder
import io.circe.generic.auto._
import io.circe.parser.decode

class IdentityConnector(config: IdentityConfig) {

  def getConsentsReq(identityId: String): Either[SoftOptInError, IdapiUserResponse] = {
    val url = s"${config.identityUrl}/user/$identityId"

    sendGetReq(url).left
      .map(error => SoftOptInError("IdentityConnector", s"Identity request failed: $error"))
      .flatMap { result =>
        decode[IdapiUserResponse](result.body).left.map(decodeError =>
          SoftOptInError(
            "IdentityConnector",
            s"Identity GET request failed while processing $identityId:$decodeError. String to decode ${result.body}",
          ),
        )
      }
  }

  def sendConsentsReq(identityId: String, body: String): Either[SoftOptInError, Unit] = {
    val url = s"${config.identityUrl}/user/$identityId"

    handleConsentsResp(
      sendPatchReq(url, body),
      errorDesc = s"Identity PATCH request failed while processing $identityId with body $body",
    )
  }

  def sendGetReq(url: String): Either[Throwable, HttpResponse[String]] = {
    Try(
      Http(url)
        .header("Authorization", s"Bearer ${config.identityToken}")
        .method("GET")
        .asString,
    ).toEither
  }
  def sendPatchReq(url: String, body: String): Either[Throwable, HttpResponse[String]] = {
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
      .map(i => SoftOptInError("IdentityConnector", s"Identity request failed: $i"))
      .flatMap { response =>
        if (response.isSuccess)
          Right(())
        else
          Left(SoftOptInError("IdentityConnector", s"$errorDesc. Status code: ${response.code}"))
      }
  }

}
