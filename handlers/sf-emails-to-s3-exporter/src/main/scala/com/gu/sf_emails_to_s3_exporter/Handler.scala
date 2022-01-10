package com.gu.sf_emails_to_s3_exporter

import com.gu.sf_emails_to_s3_exporter.ConfirmationWriteBackToSF.{EmailMessageToUpdate, EmailMessagesToUpdate}
import com.gu.sf_emails_to_s3_exporter.S3Connector.{fileExistsInS3, getJsonForAppend, writeEmailsJsonToS3}
import com.gu.sf_emails_to_s3_exporter.SFConnector.{SfAuthDetails, auth, doSfCompositeRequest, getEmailsFromSfByQuery}
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

      emailsFromSF <- getEmailsFromSfByQuery(sfAuthDetails)
      s3SaveResponses = saveEmailsToS3ThenWriteSuccessToSFThenQueryForMoreIfTheyExist(sfAuthDetails, emailsFromSF)
    } yield {

      //      sfAuth match {
      //
      //        case Left(failure) => {
      //          logger.error("Error occurred. details:" + failure)
      //          throw new RuntimeException("Error occurred. details: " + failure)
      //        }
      //
      //        case Right(successfulAuth) => {}
      //      }
    }
  }

  def saveEmailsToS3ThenWriteSuccessToSFThenQueryForMoreIfTheyExist(sfAuthDetails: SfAuthDetails, response: EmailsFromSfResponse.Response): Unit = {

    val sfEmailsGroupedByCaseNumber = response
      .records
      .groupBy(_.Parent.CaseNumber)

    //save files to s3 and return successes

    val awsResponses = sfEmailsGroupedByCaseNumber.map {
      case (caseNumber, caseRecords) => {

        val json = getCreateOrAppendJson(caseNumber, caseRecords)
        println("json:" + json)

        val awsResponse = writeEmailsJsonToS3(
          caseNumber,
          json
        )

        awsResponse

      }
    }

    val successIds = awsResponses
      .toSeq
      .filter(_.isRight).flatMap(_.right.get)
    println("successIds:" + successIds);

    val abc = successIds.map(
      a => EmailMessageToUpdate(a)
    )
    println("abc:" + abc.asJson.toString())
    println("Updating sf records:....")

    val bbb = EmailMessagesToUpdate(false, abc)
    println("bbb:" + bbb.asJson.toString())

    val ccc = doSfCompositeRequest(sfAuthDetails, bbb.asJson.toString(), "PATCH")
    println("ccc:" + ccc)
    //parse successes to request body for sf rest write

    //process more emails if they exist
    //    if (!response.done) {
    //      val nextBatchOfEmails = getEmailsFromSfByRecordsetReference(sfAuthDetails, response.nextRecordsUrl.get)
    //
    //      nextBatchOfEmails
    //        .map(
    //          nextPageEmails => saveEmailsToS3AndQueryForMoreIfTheyExist(sfAuthDetails, nextPageEmails)
    //        )
    //    }
  }

  def getCreateOrAppendJson(caseNumber: String, caseRecords: Seq[EmailsFromSfResponse.Records]): String = {

    fileExistsInS3(caseNumber) match {

      case true => {
        println("IS APPEND")
        getJsonForAppend(
          caseNumber,
          caseRecords
        )
      }

      case false => {
        println("IS CREATE")
        caseRecords.asJson.toString()
      }
    }

  }
}
