package com.gu.sf_emails_to_s3_exporter

import io.circe.Error
import io.circe.generic.auto.exportDecoder
import io.circe.parser.decode
import scalaj.http.Http

object SFConnector {

  case class SfAuthDetails(access_token: String, instance_url: String)

  def getEmailsFromSfByQuery(sfAuthDetails: SfAuthDetails): Either[Error, EmailsFromSfResponse.Response] = {
    val responseBody = Http(s"${sfAuthDetails.instance_url}/services/data/${System.getenv("apiVersion")}/query/")
      .param("q", GetEmailsQuery.query)
      .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
      .method("GET")
      .asString
      .body

    decode[EmailsFromSfResponse.Response](responseBody)
  }

  def getEmailsFromSfByRecordsetReference(sfAuthDetails: SfAuthDetails, nextRecordsURL: String): Either[Error, EmailsFromSfResponse.Response] = {
    val responseBody = Http(s"${sfAuthDetails.instance_url}" + nextRecordsURL)
      .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
      .method("GET")
      .asString
      .body

    decode[EmailsFromSfResponse.Response](responseBody)
  }

  def auth(salesforceConfig: SalesforceConfig): String = {
    Http(s"${System.getenv("authUrl")}/services/oauth2/token")
      .postForm(
        Seq(
          "grant_type" -> "password",
          "client_id" -> salesforceConfig.clientId,
          "client_secret" -> salesforceConfig.clientSecret,
          "username" -> salesforceConfig.userName,
          "password" -> s"${salesforceConfig.password}${salesforceConfig.token}"
        )
      )
      .asString
      .body
  }
}
