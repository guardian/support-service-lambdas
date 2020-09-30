package com.gu.contact_us_api

import com.gu.contact_us_api.models.{ContactUsEnvConfig, ContactUsError, SFAuthFailure, SFAuthSuccess, SFCompositeRequest, SFCompositeResponse, SFErrorDetails}
import io.circe.parser._
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

    if (response.isSuccess) {
      decode[SFAuthSuccess](response.body)
        .left
        .map(i => ContactUsError("Decode", s"Failed to decode Salesforce's auth response into SFAuthSuccess: ${i.getMessage}"))
        .map(_.access_token)
    } else {
      decode[SFAuthFailure](response.body)
        .left
        .map(i => ContactUsError("Decode", s"Failed to decode Salesforce's auth response into SFAuthFailure: ${i.getMessage}"))
        .flatMap(value => Left(ContactUsError("Salesforce", s"Could not authenticate: Status code: ${response.code}. ${value.error} - ${value.error_description}")))

    }
  }

  def sendReq(env: ContactUsEnvConfig, token: String, request: SFCompositeRequest): Either[ContactUsError, Unit] = {
    val response = Http(env.reqEndpoint)
      .header("Content-Type", "application/json")
      .header("Authorization", s"Bearer $token")
      .postData(request.asJson.toString())
      .asString

    if (response.isSuccess) {
      decode[SFCompositeResponse](response.body)
        .left
        .map(i => ContactUsError("Decode", s"Failed to decode Salesforce's response into SFCompositeResponse: ${i.getMessage}"))
        .flatMap(compositeResponse => {
          if (compositeResponse.isSuccess) Right(())
          else Left(ContactUsError("Salesforce", s"Could not complete composite request. Status code: ${response.code}. ${compositeResponse.errorsAsString.getOrElse("")}"))
        }
        )
    } else {
      decode[List[SFErrorDetails]](response.body)
        .left
        .map(i => ContactUsError("Decode", s"Failed to decode Salesforce's response into List[SFErrorDetails]: ${i.getMessage}"))
        .flatMap(errors => {
          val errorDetails = errors.map(error => error.asString).mkString(", ")
          Left(ContactUsError("Salesforce",s"Could not complete request. Status code: ${response.code}. $errorDetails"))
        })
    }
  }
}
