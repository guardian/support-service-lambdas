package com.gu.sf_emails_to_s3_exporter

import com.gu.sf_emails_to_s3_exporter.ConfirmationWriteBackToSF.{EmailMessageToUpdate, EmailMessagesToUpdate}
import io.circe.Error
import io.circe.generic.auto.{_}
import io.circe.parser.decode
import io.circe.syntax.EncoderOps
import scalaj.http.Http

import scala.util.Try

object SFConnector {

  case class SfAuthDetails(access_token: String, instance_url: String)

  def getEmailsFromSfByQuery(sfAuthDetails: SfAuthDetails): Either[Error, EmailsFromSfResponse.Response] = {
    val responseBody = Http(s"${sfAuthDetails.instance_url}/services/data/${System.getenv("apiVersion")}/query/")
      .param("q", GetEmailsQuery.query)
      .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
      .header("Sforce-Query-Options", "batchSize=200")
      .method("GET")
      .asString
      .body

    decode[EmailsFromSfResponse.Response](responseBody)
  }

  def writebackSuccessesToSf(sfAuthDetails: SfAuthDetails, successIds: Seq[String]): Either[Throwable, String] = {
    println("writing success back to SF")
    val writebackResponse = doSfCompositeRequest(
      sfAuthDetails,
      EmailMessagesToUpdate(
        false,
        successIds.map(
          sfEmailId => EmailMessageToUpdate(sfEmailId)
        )
      ).asJson.toString(),
      "PATCH"
    )
    println("writebackResponse:" + writebackResponse)
    writebackResponse
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

  def doSfCompositeRequest(
    sfAuthDetails: SfAuthDetails,
    jsonBody: String,
    requestType: String
  ): Either[Throwable, String] = {

    Try {
      Http(
        s"${sfAuthDetails.instance_url}/services/data/v45.0/composite/sobjects"
      ).header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
        .header("Content-Type", "application/json")
        .put(jsonBody)
        .method(requestType)
        .asString
        .body
    }.toEither
  }
}
