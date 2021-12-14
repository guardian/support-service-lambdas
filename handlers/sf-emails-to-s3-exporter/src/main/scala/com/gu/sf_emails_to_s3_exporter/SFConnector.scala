package com.gu.sf_emails_to_s3_exporter

import com.gu.sf_emails_to_s3_exporter.Handler.SfAuthDetails
import io.circe.Error
import io.circe.generic.auto.exportDecoder
import io.circe.parser.decode
import scalaj.http.Http

object SFConnector {

  def getEmailsFromSf(sfAuthDetails: SfAuthDetails): Either[Error, EmailsFromSfResponse.Response] = {
    val responseBody = doSfGetWithQuery(sfAuthDetails, GetEmailsQuery.query)
    decode[EmailsFromSfResponse.Response](responseBody)
  }

  def doSfGetWithQuery(sfAuthDetails: SfAuthDetails, query: String): String = {
    Http(s"${sfAuthDetails.instance_url}/services/data/v50.0/query/")
      .param("q", query)
      .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
      .method("GET")
      .asString
      .body
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
