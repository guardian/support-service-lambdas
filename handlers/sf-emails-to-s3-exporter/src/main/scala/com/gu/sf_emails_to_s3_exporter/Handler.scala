package com.gu.sf_emails_to_s3_exporter

import com.typesafe.scalalogging.LazyLogging
import io.circe.Error
import io.circe.generic.auto.exportDecoder
import io.circe.parser.decode
import scalaj.http.{Http, HttpOptions}

object Handler extends LazyLogging {
  case class SfAuthDetails(access_token: String, instance_url: String)

  lazy val optConfig = for {
    sfUserName <- Option(System.getenv("username"))
    sfClientId <- Option(System.getenv("clientId"))
    sfClientSecret <- Option(System.getenv("clientSecret"))
    sfPassword <- Option(System.getenv("password"))
    sfToken <- Option(System.getenv("token"))
    sfAuthUrl <- Option(System.getenv("authUrl"))
    stage <- Option(System.getenv("stageName"))
  } yield Config(
    SalesforceConfig(
      userName = sfUserName,
      clientId = sfClientId,
      clientSecret = sfClientSecret,
      password = sfPassword,
      token = sfToken,
      authUrl = sfAuthUrl
    ),
    AwsConfig(
      stageName = stage
    )
  )

  def main(args: Array[String]): Unit = {
    handleRequest()
  }

  def handleRequest(): Unit = {
    val emails = for {
      config <- optConfig.toRight(new RuntimeException("Missing config value"))
      sfAuthDetails <- decode[SfAuthDetails](auth(config.salesforceConfig))
      emailsForExportFromSf <- getEmailsFromSf(sfAuthDetails)
    } yield emailsForExportFromSf

    logger.info("emails:" + emails)
  }

  def getEmailsFromSf(sfAuthDetails: SfAuthDetails): Either[Error, EmailsFromSfResponse.Response] = {
    logger.info("Getting emails from Salesforce...")

    val query = GetEmailsQuery.query

    val responseBody = doSfGetWithQuery(sfAuthDetails, query)
    println("response body:" + responseBody)
    decode[EmailsFromSfResponse.Response](responseBody)
  }

  def doSfGetWithQuery(sfAuthDetails: SfAuthDetails, query: String): String = {
    Http(s"${sfAuthDetails.instance_url}/services/data/v50.0/query/")
      .param("q", query)
      .option(HttpOptions.readTimeout(30000))
      .header("Authorization", s"Bearer ${sfAuthDetails.access_token}")
      .method("GET")
      .asString
      .body
  }

  def auth(salesforceConfig: SalesforceConfig): String = {
    logger.info("Authenticating with Salesforce...")
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
