package com.gu.sf_emails_to_s3_exporter

import com.gu.sf_emails_to_s3_exporter.S3Connector.saveEmailToS3
import com.gu.sf_emails_to_s3_exporter.SFConnector._
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import io.circe.parser._

object Handler extends LazyLogging {

  def main(args: Array[String]): Unit = {
    handleRequest()
  }

  def handleRequest(): Unit = {
    (for {
      config <- SalesforceConfig.fromEnvironment.toRight("Missing config value")
    } yield for {
      sfAuthDetails <- decode[SfAuthDetails](auth(config).getOrElse(throw new RuntimeException("Error in SF Authentication")))
      emailsFromSF <- getEmailsFromSfByQuery(sfAuthDetails)
    } yield processEmails(sfAuthDetails, emailsFromSF)) match {
      case Left(abc) => { println(abc) }
      case Right(fff) => { println(fff) }
    }
  }

  def processEmails(sfAuthDetails: SfAuthDetails, emailsDataFromSF: EmailsFromSfResponse.Response): Any = {

    val emailIdsSuccessfullySavedToS3 = getEmailIdsSuccessfullySavedToS3(emailsDataFromSF)

    println("emailIdsSuccessfullySavedToS3:" + emailIdsSuccessfullySavedToS3)

    if (!emailIdsSuccessfullySavedToS3.isEmpty) {
      val sfWritebackResponse = writebackSuccessesToSf(sfAuthDetails, emailIdsSuccessfullySavedToS3)
      println("sfWritebackResponse:" + sfWritebackResponse)
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
}
