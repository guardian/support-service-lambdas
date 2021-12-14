package com.gu.sf_emails_to_s3_exporter

import com.gu.sf_emails_to_s3_exporter.S3Connector.writeEmailsJsonToS3
import com.gu.sf_emails_to_s3_exporter.SFConnector.{SfAuthDetails, auth, getEmailsFromSf}
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import io.circe.generic.decoding.DerivedDecoder.deriveDecoder
import io.circe.parser.decode
import io.circe.syntax.EncoderOps

object Handler extends LazyLogging {

  def main(args: Array[String]): Unit = {
    handleRequest()
  }

  def handleRequest(): Unit = {
    val emails  = for {
      config <- SalesforceConfig.fromEnvironment.toRight("Missing config value")
      sfAuthDetails <- decode[SfAuthDetails](auth(config))
    for{
      config <- optConfig.toRight(new RuntimeException("Missing config value"))
      sfAuthDetails <- decode[SfAuthDetails](auth(config.salesforceConfig))
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

  }
}

