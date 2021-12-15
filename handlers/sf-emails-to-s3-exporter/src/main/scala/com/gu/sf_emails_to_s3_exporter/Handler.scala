package com.gu.sf_emails_to_s3_exporter

import com.gu.sf_emails_to_s3_exporter.S3Connector.{appendToFileInS3, fileExistsInS3, writeEmailsJsonToS3}
import com.gu.sf_emails_to_s3_exporter.SFConnector.{auth, getEmailsFromSf, SfAuthDetails}
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
        logger.error("Error occurred. details: " + failure)
        throw new RuntimeException("Missing config value")
      }

      case Right(emailsFromSF) => {
        val sfEmailsGroupedByCaseNumber = emailsFromSF
          .records
          .groupBy(_.Parent.CaseNumber)

        createOrAppendToS3Files(sfEmailsGroupedByCaseNumber)
      }
    }
  }

  def createOrAppendToS3Files(sfEmailsByCaseNumber: Map[String, Seq[EmailsFromSfResponse.Records]]): Unit = {

    sfEmailsByCaseNumber.foreach {
      case (caseNumber, caseRecords) =>

        fileExistsInS3(caseNumber + ".json") match {

          case true => {
            appendToFileInS3(
              caseNumber,
              caseRecords
            )
          }

          case false => {
            writeEmailsJsonToS3(
              caseNumber,
              caseRecords.asJson.toString()
            )
          }
        }
    }
  }
}
