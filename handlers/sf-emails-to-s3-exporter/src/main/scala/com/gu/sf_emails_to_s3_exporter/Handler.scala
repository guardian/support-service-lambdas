package com.gu.sf_emails_to_s3_exporter

import com.gu.sf_emails_to_s3_exporter.S3Connector.saveEmailToS3
import com.gu.sf_emails_to_s3_exporter.SFConnector._
import com.typesafe.scalalogging.LazyLogging

import scala.util.Try

object Handler extends LazyLogging {

  def main(args: Array[String]): Unit = {
    handleRequest()
  }

  def handleRequest(): Unit = {

    println("sfUserName:"+System.getenv("sfUserName"))
    println("sfClientId:"+System.getenv("sfClientId"))
    println("sfClientSecret:"+System.getenv("sfClientSecret"))
    println("sfPassword:"+System.getenv("sfPassword"))
    println("sfToken:"+System.getenv("sfToken"))
    println("sfAuthUrl:"+System.getenv("sfAuthUrl"))
    println("sfApiVersion:"+System.getenv("sfApiVersion"))
    println("bucketName:"+System.getenv("bucketName"))

//    val emailsFromSF = for {
//      config <- Config.fromEnvironment.toRight("Missing config value")
//      authentication <- auth(config.sfConfig)
//      sfAuthDetails <- decode[SfAuthDetails](authentication)
//      emailsFromSF <- getEmailsFromSfByQuery(sfAuthDetails, config.sfConfig.apiVersion)
//    } yield config



//    emailsFromSF match {
//      case Left(ex) => {
//        logger.error("Error: " + ex)
//        throw new RuntimeException(ex.toString)
//      }
//      case Right(success) => {
//        logger.info("Processing complete")
//      }
//    }

  }

  def processEmails(sfAuthDetails: SfAuthDetails, emailsDataFromSF: EmailsFromSfResponse.Response, bucketName: String): Any = {

    val emailIdsSuccessfullySavedToS3 = getEmailIdsSuccessfullySavedToS3(emailsDataFromSF, bucketName)

    if (!emailIdsSuccessfullySavedToS3.isEmpty) {
      writebackSuccessesToSf(sfAuthDetails, emailIdsSuccessfullySavedToS3).map(
        response => response.map(
          individualEmailUpdateAttempt =>
            if (individualEmailUpdateAttempt.success.get) {
              logger.info("Successful write back to sf for record:" + individualEmailUpdateAttempt.id)
            } else {
              logger.info("Failed to write back to sf for record:" + individualEmailUpdateAttempt)
            }
        )
      )
    }

    //process more emails if they exist
    if (!emailsDataFromSF.done) {
      processNextPageOfEmails(sfAuthDetails, emailsDataFromSF.nextRecordsUrl.get, bucketName)
    }

  }

  def getEmailIdsSuccessfullySavedToS3(emailsDataFromSF: EmailsFromSfResponse.Response, bucketName: String): Seq[String] = {

    emailsDataFromSF
      .records
      .map(email => saveEmailToS3(email, bucketName))
      .collect { case Right(value) => value }
      .flatten
  }

  def processNextPageOfEmails(sfAuthDetails: SfAuthDetails, url: String, bucketName: String): Unit = {
    for {
      nextBatchOfEmails <- getEmailsFromSfByRecordsetReference(sfAuthDetails, url)
    } yield processEmails(sfAuthDetails, nextBatchOfEmails, bucketName)
  }

  def safely[A](doSomething: => A): Either[CustomFailure, A] =
    Try(doSomething).toEither.left.map(CustomFailure.fromThrowable)
}
