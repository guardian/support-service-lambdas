package com.gu.contact_us_api

import com.gu.contact_us_api.models.{
  ContactUsConfig,
  ContactUsError,
  SFAuthFailure,
  SFAuthSuccess,
  SFCompositeRequest,
  SFCompositeResponse,
  SFErrorDetails,
}
import com.gu.contact_us_api.ParserUtils._
import io.circe.generic.auto._
import io.circe.syntax._
import scalaj.http.{Http, HttpRequest, HttpResponse}
import com.gu.contact_us_api.services._

class SalesforceConnector(runRequest: HttpRequest => Either[ContactUsError, HttpResponse[String]]) {

  def handle(req: SFCompositeRequest): Either[ContactUsError, Unit] = {
    for {
      env <- ContactUsConfig.env
      salesforceSecrets <- Secrets.getSalesforceSecrets
      membersDataAPISecrets <- Secrets.getMembersDataAPISecrets
      token <- auth(env, salesforceSecrets, membersDataAPISecrets)
      resp <- sendReq(env, token, req)
    } yield resp
  }

  def auth(
      env: ContactUsConfig,
      salesforceSecrets: SalesforceSecrets,
      membersDataAPISecrets: MembersDataAPISecrets,
  ): Either[ContactUsError, String] = {
    runRequest(
      Http(env.authEndpoint)
        .postForm(
          Seq(
            ("grant_type", "password"),
            ("client_id", salesforceSecrets.clientId),
            ("client_secret", salesforceSecrets.clientSecret),
            ("username", membersDataAPISecrets.username),
            ("password", membersDataAPISecrets.password + membersDataAPISecrets.token),
          ),
        ),
    )
      .flatMap(response => {
        if (response.isSuccess)
          decode[SFAuthSuccess](response.body, Some("SFAuthSuccess"))
            .map(_.access_token)
        else
          decode[SFAuthFailure](response.body, Some("SFAuthFailure"))
            .flatMap(value =>
              Left(
                ContactUsError(
                  "Salesforce",
                  s"Could not authenticate: Status code: ${response.code}. ${value.error} - ${value.error_description}",
                ),
              ),
            )
      })
  }

  def sendReq(env: ContactUsConfig, token: String, request: SFCompositeRequest): Either[ContactUsError, Unit] = {
    runRequest(
      Http(env.reqEndpoint)
        .timeout(connTimeoutMs = 30000, readTimeoutMs = 30000)
        .header("Content-Type", "application/json")
        .header("Authorization", s"Bearer $token")
        .postData(request.asJson.toString()),
    )
      .flatMap(response => {
        if (response.isSuccess)
          decode[SFCompositeResponse](response.body, Some("SFCompositeResponse"))
            .flatMap(compositeResponse => {
              if (compositeResponse.isSuccess) Right(())
              else
                Left(
                  ContactUsError(
                    "Salesforce",
                    s"Could not complete composite request. Status code: ${response.code}. ${compositeResponse.errorsAsString
                        .getOrElse("")}",
                  ),
                )
            })
        else
          decode[List[SFErrorDetails]](response.body, Some("List[SFErrorDetails]"))
            .flatMap(errors =>
              Left(
                ContactUsError(
                  "Salesforce",
                  s"Could not complete request. Status code: ${response.code}. ${errors.map(_.asString).mkString(", ")}",
                ),
              ),
            )
      })
  }
}
