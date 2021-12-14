package com.gu.sf_emails_to_s3_exporter

import com.gu.sf_emails_to_s3_exporter.SFConnector.{auth, getEmailsFromSf}
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.decoding.DerivedDecoder.deriveDecoder
import io.circe.parser.decode

object Handler extends LazyLogging {

  case class SfAuthDetails(access_token: String, instance_url: String)

  def main(args: Array[String]): Unit = {
    handleRequest()
  }

  def handleRequest(): Unit = {
    val emails  = for {
      config <- SalesforceConfig.fromEnvironment.toRight("Missing config value")
      sfAuthDetails <- decode[SfAuthDetails](auth(config))
      emailsForExportFromSf <- getEmailsFromSf(sfAuthDetails)
    } yield emailsForExportFromSf

    logger.info("emails:"+emails)

    emails match {

      case Left(failure) => {
        logger.error("Missing config value. details: " + failure)
        throw new RuntimeException("Missing config value")
      }

      case Right(success) => logger.info("Config successfully retrieved")

    }

  }
}

