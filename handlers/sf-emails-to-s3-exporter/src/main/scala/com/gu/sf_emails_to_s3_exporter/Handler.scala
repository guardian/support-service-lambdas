package com.gu.sf_emails_to_s3_exporter

import com.gu.sf_emails_to_s3_exporter.SFConnector.{auth, getEmailsFromSf}
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto.exportDecoder
import io.circe.parser.decode

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

}
