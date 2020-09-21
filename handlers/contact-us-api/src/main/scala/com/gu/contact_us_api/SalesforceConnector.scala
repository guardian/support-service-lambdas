package com.gu.contact_us_api

import com.gu.contact_us_api.models.{ContactUsRequest, SFAuthFailure, SFAuthSuccess, SFCompositeRequest, SFCompositeResponse, SFErrorDetails}
import io.circe.parser._
import io.circe.generic.auto._
import io.circe.syntax._
import scalaj.http.Http

class SalesforceConnector() {

  def handle(req: SFCompositeRequest): Either[Throwable, Unit] = {
    for {
      token <- auth()
      resp <- sendReq(token, req)
    } yield resp
  }

  def auth(): Either[Throwable, String] = {
    val response = Http(ContactUsConfig.authEndpoint)
      .postForm(
        Seq(
          ("grant_type", "password"),
          ("client_id", ContactUsConfig.clientID),
          ("client_secret", ContactUsConfig.clientSecret),
          ("username", ContactUsConfig.username),
          ("password", ContactUsConfig.password + ContactUsConfig.token),
        )
      )
      .asString

    if (response.isSuccess) {
      decode[SFAuthSuccess](response.body).map(_.access_token)
    } else {
      decode[SFAuthFailure](response.body).flatMap(value => {
        Left(new Throwable(s"Could not authenticate: Status code: ${response.code}. ${value.error} - ${value.error_description}"))
      })
    }
  }

  def sendReq(token: String, request: SFCompositeRequest): Either[Throwable, Unit] = {
    val response = Http(ContactUsConfig.reqEndpoint)
      .header("Content-Type", "application/json")
      .header("Authorization", s"Bearer $token")
      .postData(request.asJson.toString())
      .asString

    if (response.isSuccess) {
      decode[SFCompositeResponse](response.body).flatMap(compositeResponse => {
          if(compositeResponse.isSuccess) Right(())
          else Left(new Throwable(s"Could not complete composite request. Status code: ${response.code}. ${compositeResponse.errorsAsString.getOrElse("")}"))
        }
      )
    } else {
      decode[List[SFErrorDetails]](response.body).flatMap(errors => {
        val errorDetails = errors.map(error => error.asString).mkString(", ")
        Left(new Throwable(s"Could not complete request. Status code: ${response.code}. ${errorDetails}"))
      })
    }
  }
}
