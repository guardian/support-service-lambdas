package com.gu.sf_emails_to_s3_exporter

import com.gu.sf_emails_to_s3_exporter.S3Connector.writeEmailsJsonToS3
import com.gu.sf_emails_to_s3_exporter.SFConnector.{SfAuthDetails, auth, getEmailsFromSf}
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import io.circe.parser._
import io.circe.syntax._

object Handler extends LazyLogging {

  def main(args: Array[String]): Unit = {
    handleRequest()
  }

  def handleRequest(): Unit = {
    val emails = for {
      config <- SalesforceConfig.fromEnvironment.toRight("Missing config value")
      sfAuthDetails <- decode[SfAuthDetails](auth(config))
      emailsForExportFromSf <- getEmailsFromSf(sfAuthDetails)
    } yield emailsForExportFromSf

    logger.info("emails:" + emails)

    emails match {

      case Left(failure) => {
        logger.error("Missing config value. details: " + failure)
        throw new RuntimeException("Missing config value")
      }

      case Right(emailsFromSF) => {
        val emailsGroupedByCaseNumber = emailsFromSF
          .records
          .groupBy(_.Parent.CaseNumber)

        emailsGroupedByCaseNumber.foreach {
          case (caseNumber, caseRecords) =>
            writeEmailsJsonToS3(
              caseNumber,
              caseRecords.asJson.toString()
            )
        }
      }
    }
  }
}
