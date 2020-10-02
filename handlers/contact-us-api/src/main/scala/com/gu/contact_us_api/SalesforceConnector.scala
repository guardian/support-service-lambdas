package com.gu.contact_us_api

import com.gu.contact_us_api.models.{ContactUsEnvConfig, ContactUsError, SFAuthFailure, SFAuthSuccess, SFCompositeRequest, SFCompositeResponse, SFErrorDetails}
import com.gu.contact_us_api.ParserUtils._
import io.circe.generic.auto._
import io.circe.syntax._
import scalaj.http.Http

class SalesforceConnector() {

  def handle(req: SFCompositeRequest): Either[ContactUsError, Unit] = {
    for {
      env <- ContactUsConfig.env.left.map(i => ContactUsError("Environment", i.getMessage))
      token <- auth(env)
      resp <- sendReq(env, token, req)
    } yield resp
  }

  def auth(env: ContactUsEnvConfig): Either[ContactUsError, String] = {
    val response = Http(env.authEndpoint)
      .postForm(
        Seq(
          ("grant_type", "password"),
          ("client_id", env.clientID),
          ("client_secret", env.clientSecret),
          ("username", env.username),
          ("password", env.password + env.token),
        )
      )
      .asString

    if (response.isSuccess)
      decode[SFAuthSuccess](response.body, Some("SFAuthSuccess"))
        .map(_.access_token)
    else
      decode[SFAuthFailure](response.body, Some("SFAuthFailure"))
        .flatMap(value =>
          Left(ContactUsError("Salesforce", s"Could not authenticate: Status code: ${response.code}. ${value.error} - ${value.error_description}")))

  }

  def sendReq(env: ContactUsEnvConfig, token: String, request: SFCompositeRequest): Either[ContactUsError, Unit] = {
    val response = Http(env.reqEndpoint)
      .header("Content-Type", "application/json")
      .header("Authorization", s"Bearer $token")
      .postData(request.asJson.toString())
      .asString

    if (response.isSuccess)
      decode[SFCompositeResponse](response.body, Some("SFCompositeResponse"))
        .flatMap(compositeResponse => {
          if (compositeResponse.isSuccess) Right(())
          else Left(ContactUsError("Salesforce", s"Could not complete composite request. Status code: ${response.code}. ${compositeResponse.errorsAsString.getOrElse("")}"))
        })
    else
      decode[List[SFErrorDetails]](response.body, Some("List[SFErrorDetails]"))
        .flatMap(errors =>
          Left(ContactUsError("Salesforce", s"Could not complete request. Status code: ${response.code}. ${errors.map(_.asString).mkString(", ")}"))
        )
  }

}
