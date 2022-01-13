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
    for {
      config <- SalesforceConfig.fromEnvironment.toRight("Missing config value")
      sfAuthDetails <- decode[SfAuthDetails](auth(config))
      emailsFromSF <- getEmailsFromSfByQuery(sfAuthDetails)
    } yield processEmails(sfAuthDetails, emailsFromSF)

  }

  def processEmails(sfAuthDetails: SfAuthDetails, emailsDataFromSF: EmailsFromSfResponse.Response): Unit = {

    val emailIdsSuccessfullySavedToS3 = emailsDataFromSF.records.map(saveEmailToS3)

    writebackSuccessesToSf(sfAuthDetails, emailIdsSuccessfullySavedToS3)

    //process more emails if they exist
    if (!emailsDataFromSF.done) {

      for {
        nextBatchOfEmails <- getEmailsFromSfByRecordsetReference(sfAuthDetails, emailsDataFromSF.nextRecordsUrl.get)
      } yield processEmails(sfAuthDetails, nextBatchOfEmails)

    }
  }
}
