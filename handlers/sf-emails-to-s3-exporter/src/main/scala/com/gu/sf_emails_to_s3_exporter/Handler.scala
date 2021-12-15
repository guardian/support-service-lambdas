package com.gu.sf_emails_to_s3_exporter

import com.gu.sf_emails_to_s3_exporter.S3Connector.{appendToFileInS3, fileExistsInS3, writeEmailsJsonToS3}
import com.gu.sf_emails_to_s3_exporter.SFConnector.{SfAuthDetails, auth, getEmailsFromSfByQuery, getEmailsFromSfByRecordsetReference}
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import io.circe.parser._
import io.circe.syntax._

object Handler extends LazyLogging {

  def main(args: Array[String]): Unit = {
    handleRequest()
  }

  def handleRequest(): Unit = {
    val sfAuth = for {
      config <- SalesforceConfig.fromEnvironment.toRight("Missing config value")
      sfAuthDetails <- decode[SfAuthDetails](auth(config))
    } yield sfAuthDetails

    sfAuth match {

      case Left(failure) => {
        logger.error("Error occurred. details: " + failure)
        throw new RuntimeException("Error occurred. details: " + failure)
      }

      case Right(successfulAuth) => {
        for {
          emailsForExportFromSf <- getEmailsFromSfByQuery(successfulAuth)
        } yield {
          saveEmailsToS3AndQueryForMoreIfTheyExist(successfulAuth, emailsForExportFromSf)
        }
      }
    }
  }

  def saveEmailsToS3AndQueryForMoreIfTheyExist(sfAuthDetails: SfAuthDetails, response: EmailsFromSfResponse.Response): Unit = {

    val sfEmailsGroupedByCaseNumber = response
      .records
      .groupBy(_.Parent.CaseNumber)

    createOrAppendToS3Files(sfEmailsGroupedByCaseNumber)

    response.done match {
      case true => logger.info("Batch Complete")
      case false => {
        for {
          nextPageEmails <- getEmailsFromSfByRecordsetReference(sfAuthDetails, response.nextRecordsUrl.get)
        } yield {
          saveEmailsToS3AndQueryForMoreIfTheyExist(sfAuthDetails, nextPageEmails)
        }
      }
    }
  }

  def createOrAppendToS3Files(sfEmailsByCaseNumber: Map[String, Seq[EmailsFromSfResponse.Records]]): Unit = {

    sfEmailsByCaseNumber.foreach {
      case (caseNumber, caseRecords) =>

        fileExistsInS3(caseNumber) match {

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
