package com.gu.sf_emails_to_s3_exporter

import com.gu.sf_emails_to_s3_exporter.ConfirmationWriteBackToSF.{EmailMessageToUpdate, EmailMessagesToUpdate}
import com.gu.sf_emails_to_s3_exporter.Handler.safely
import com.typesafe.scalalogging.LazyLogging
import io.circe.Error
import io.circe.generic.auto._
import io.circe.parser.decode
import io.circe.syntax.EncoderOps
import scalaj.http.{Http, HttpOptions}

object SFConnector extends LazyLogging {

  case class SfAuthDetails(access_token: String, instance_url: String)

  def getEmailsFromSfByQuery(sfAuthDetails: SfAuthDetails, sfApiVersion: String): Either[Error, EmailsFromSfResponse.Response] = {
    logger.info("Getting emails from sf by query...")

    val responseBody = Http(s"${sfAuthDetails.instance_url}/services/data/$sfApiVersion/query/")
      .param("q", GetEmailsQuery.query)
      .option(HttpOptions.readTimeout(30000))
      .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
      .header("Sforce-Query-Options", "batchSize=200")
      .method("GET")
      .asString
      .body
    logger.info(s"responseBody:$responseBody")
    decode[EmailsFromSfResponse.Response](responseBody)
  }

  def writebackSuccessesToSf(sfAuthDetails: SfAuthDetails, successIds: Seq[String]): Either[Error, Seq[WritebackToSFResponse.WritebackResponse]] = {
    logger.info("Writing successes back to Salesforce...")

    doSfCompositeRequest(
      sfAuthDetails,
      EmailMessagesToUpdate(
        false,
        successIds.map(
          sfEmailId => EmailMessageToUpdate(sfEmailId)
        )
      ).asJson.toString(),
      "PATCH"
    ) match {
        case Left(ex) => {
          logger.error(ex.toString)
          Left(ex)
        }
        case Right(value) => {
          Right(value)
        }
      }

  }

  def getEmailsFromSfByRecordsetReference(sfAuthDetails: SfAuthDetails, nextRecordsURL: String): Either[Error, EmailsFromSfResponse.Response] = {
    logger.info("Getting next batch of emails from sf by recordset reference...")

    val responseBody = Http(s"${sfAuthDetails.instance_url}" + nextRecordsURL)
      .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
      .option(HttpOptions.readTimeout(30000))
      .method("GET")
      .asString
      .body

    decode[EmailsFromSfResponse.Response](responseBody)
  }

  def auth(salesforceConfig: SalesforceConfig): Either[CustomFailure, String] = {
    logger.info("Authenticating with Salesforce...")

    safely(

      Http(s"${salesforceConfig.authUrl}/services/oauth2/token")
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
    )
  }

  def doSfCompositeRequest(
    sfAuthDetails: SfAuthDetails,
    jsonBody: String,
    requestType: String
  ): Either[Error, Seq[WritebackToSFResponse.WritebackResponse]] = {

    val responseBody = Http(s"${sfAuthDetails.instance_url}/services/data/v45.0/composite/sobjects")
      .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
      .option(HttpOptions.readTimeout(30000))
      .header("Content-Type", "application/json")
      .put(jsonBody)
      .method(requestType)
      .asString
      .body

    decode[Seq[WritebackToSFResponse.WritebackResponse]](responseBody)
  }

}
