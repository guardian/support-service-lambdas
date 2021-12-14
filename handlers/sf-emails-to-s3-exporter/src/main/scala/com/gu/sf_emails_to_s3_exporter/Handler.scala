package com.gu.sf_emails_to_s3_exporter

import com.gu.sf_emails_to_s3_exporter.S3Connector.writeEmailsJsonToS3
import com.gu.sf_emails_to_s3_exporter.SFConnector.{auth, getEmailsFromSf, optConfig}
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import io.circe.generic.decoding.DerivedDecoder.deriveDecoder
import io.circe.parser.decode
import io.circe.syntax.EncoderOps

object Handler extends LazyLogging {
  case class SfAuthDetails(access_token: String, instance_url: String)

  def main(args: Array[String]): Unit = {
    handleRequest()
  }

  def handleRequest(): Unit = {
    for{
      config <- optConfig.toRight(new RuntimeException("Missing config value"))
      sfAuthDetails <- decode[SfAuthDetails](auth(config.salesforceConfig))
      emailsForExportFromSf <- getEmailsFromSf(sfAuthDetails)
    }{
      emailsForExportFromSf
        .records
        .groupBy(_.Parent.CaseNumber)
        .foreach(p =>
          writeEmailsJsonToS3(
            p._1,
            p._2.asJson.toString()
          )
        )
    }
  }
}
