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
      config <- Config.fromEnvironment.toRight("Missing config value")
      authentication <- auth(config.sfConfig)
      sfAuthDetails <- decode[SfAuthDetails](authentication)
      emailsFromSF <- getEmailsFromSfByQuery(sfAuthDetails, config.sfConfig.apiVersion)
    } yield processEmails(sfAuthDetails, emailsFromSF, config.s3Config.bucketName)

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

  def processEmails(sfAuthDetails: SfAuthDetails, emailsDataFromSF: EmailsFromSfResponse.Response, bucketName: String): Any = {
    logger.info(s"Start processing ${emailsDataFromSF.records.size} emails...")

    val emailIdsSuccessfullySavedToS3 = saveEmailsToS3(emailsDataFromSF, bucketName)

    if (!emailIdsSuccessfullySavedToS3.isEmpty) {
      writebackSuccessesToSf(sfAuthDetails, emailIdsSuccessfullySavedToS3).map(

        responseArray => responseArray.map(

          responseArrayItem =>

            responseArrayItem.success.getOrElse(None) match {
              case true => {
                logger.info(s"Successful write back to sf for record:${responseArrayItem.id}")
              }
              case false => {
                logger.error(s"Failed to write back to sf for record:$responseArrayItem")
              }
              case none => {
                logger.error(s"Failed write back Request. errorCode(${responseArrayItem.errorCode}), message: ${responseArrayItem.message}")
              }
            }
        )
      )
    }

    logger.info("More emails to retrieve from Salesforce:" + !emailsDataFromSF.done)
    //process more emails if they exist
    if (!emailsDataFromSF.done) {
      processNextPageOfEmails(sfAuthDetails, emailsDataFromSF.nextRecordsUrl.get, bucketName)
    }

  }

  def saveEmailsToS3(emailsDataFromSF: EmailsFromSfResponse.Response, bucketName: String): Seq[String] = {

    val saveToS3Attempts = for {
      saveToS3Attempt <- emailsDataFromSF
        .records
        .map(email => saveEmailToS3(email, bucketName))
    } yield saveToS3Attempt

    saveToS3Attempts.collect { case Right(value) => value }
  }

  def processNextPageOfEmails(sfAuthDetails: SfAuthDetails, url: String, bucketName: String): Unit = {
    for {
      nextBatchOfEmails <- getEmailsFromSfByRecordsetReference(sfAuthDetails, url)
    } yield processEmails(sfAuthDetails, nextBatchOfEmails, bucketName)
  }

  def safely[A](doSomething: => A): Either[CustomFailure, A] =
    Try(doSomething).toEither.left.map(CustomFailure.fromThrowable)
}
