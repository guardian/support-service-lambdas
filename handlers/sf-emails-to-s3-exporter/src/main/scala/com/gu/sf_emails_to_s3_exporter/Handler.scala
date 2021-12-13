package com.gu.sf_emails_to_s3_exporter

import com.gu.sf_emails_to_s3_exporter.SFConnector.{auth, getEmailsFromSf, optConfig}
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.decoding.DerivedDecoder.deriveDecoder
import io.circe.parser.decode

object Handler extends LazyLogging {
  case class SfAuthDetails(access_token: String, instance_url: String)

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
