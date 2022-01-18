package com.gu.sf_emails_to_s3_exporter

import com.gu.sf_emails_to_s3_exporter.S3Connector.saveEmailToS3
import com.gu.sf_emails_to_s3_exporter.SFConnector._
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import io.circe.parser._

import scala.util.Try

object Handler extends LazyLogging {

  def main(args: Array[String]): Unit = {
    handleRequest()
  }

  def handleRequest(): Unit = {

    val emailsFromSF = for {
      config <- SalesforceConfig.fromEnvironment.toRight("Missing config value")
      authentication <- auth(config)
      sfAuthDetails <- decode[SfAuthDetails](authentication)
      emailsFromSF <- getEmailsFromSfByQuery(sfAuthDetails)
    } yield processEmails(sfAuthDetails, emailsFromSF)

    emailsFromSF match {
      case Left(ex) => {
        logger.error("Error: " + ex)
        throw new RuntimeException(ex.toString)
      }
      case Right(success) => {
        logger.info("Processing complete")
      }
    }

  }

  def processEmails(sfAuthDetails: SfAuthDetails, emailsDataFromSF: EmailsFromSfResponse.Response): Any = {

    val emailIdsSuccessfullySavedToS3 = getEmailIdsSuccessfullySavedToS3(emailsDataFromSF)

    if (!emailIdsSuccessfullySavedToS3.isEmpty) {
      writebackSuccessesToSf(sfAuthDetails, emailIdsSuccessfullySavedToS3).map(
        response => response.map(
          individualEmailUpdateAttempt =>
            if (individualEmailUpdateAttempt.success.get) {
              logger.info("Successful write back to sf for record:" + individualEmailUpdateAttempt.id)
            } else {
              logger.info("Failed to write back to sf for record:" + individualEmailUpdateAttempt)
            })
      )
    }

    //process more emails if they exist
    if (!emailsDataFromSF.done) {
      processNextPageOfEmails(sfAuthDetails, emailsDataFromSF.nextRecordsUrl.get)
    }

  }

  def getEmailIdsSuccessfullySavedToS3(emailsDataFromSF: EmailsFromSfResponse.Response): Seq[String] = {

    emailsDataFromSF
      .records
      .map(saveEmailToS3)
      .collect { case Right(value) => value }
      .flatten
  }

  def processNextPageOfEmails(sfAuthDetails: SfAuthDetails, url: String): Unit = {
    for {
      nextBatchOfEmails <- getEmailsFromSfByRecordsetReference(sfAuthDetails, url)
    } yield processEmails(sfAuthDetails, nextBatchOfEmails)
  }

  def safely[A](doSomething: => A): Either[CustomFailure, A] =
    Try(doSomething).toEither.left.map(CustomFailure.fromThrowable)
}
