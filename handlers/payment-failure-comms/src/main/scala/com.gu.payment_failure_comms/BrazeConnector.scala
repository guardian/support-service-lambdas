package com.gu.payment_failure_comms

import com.gu.payment_failure_comms.models.{BrazeConfig, BrazeRequestFailure, BrazeResponseFailure, Failure}
import scalaj.http.{Http, HttpResponse}

import scala.util.Try

object BrazeConnector {

  def sendCustomEvent(brazeConfig: BrazeConfig, payload: String): Either[Failure, Unit] = {
    handleRequestResult(
      sendRequest(
        url = s"https://${brazeConfig.instanceUrl}/users/track",
        bearerToken = brazeConfig.bearerToken,
        payload = payload)
    )
  }

  def sendRequest(url: String, bearerToken: String, payload: String): Either[Throwable, HttpResponse[String]] = {
    Try(
      Http(url)
        .header("Content-Type", "application/json")
        .header("Authorization", s"Bearer ${bearerToken}")
        .postData(payload)
        .method("PATCH")
        .asString
    )
      .toEither
  }

  def handleRequestResult(result: Either[Throwable, HttpResponse[String]]): Either[Failure, Unit] = {
    result
      .left.map(i => BrazeRequestFailure(s"Attempt to contact Braze failed with error: ${i.toString}"))
      .flatMap(response =>
        if (response.isSuccess) {
          Right(())
        } else {
          Left(BrazeResponseFailure(s"The request to Braze was unsuccessful: ${response.code} - ${response.body}"))
        }
      )
  }

}
