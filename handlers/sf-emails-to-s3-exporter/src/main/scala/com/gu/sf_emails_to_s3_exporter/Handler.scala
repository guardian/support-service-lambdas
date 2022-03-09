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

    for {
      config <- Config.fromEnvironment.toRight("Missing config value")
      authentication <- auth(config.sfConfig)
      sfAuthDetails <- decode[SfAuthDetails](authentication)
      asyncProcessRecs <- getRecordsFromSF[AsyncProcessRecsFromSfResponse.Response](
        sfAuthDetails,
        config.sfConfig.apiVersion,
        GetAsyncProcessRecsQuery.query,
        batchSize = 2000
      )
    } yield {
      val asyncProcessRecIds = asyncProcessRecs.records.map(rec => rec.Id)

      if (!asyncProcessRecIds.isEmpty) {

        val batchedAsyncProcessRecs = batchAsyncProcessRecs(asyncProcessRecs.records, 200)

        batchedAsyncProcessRecs.map { asyncProcessRecGroup =>

          val groupedAsyncProcessRecIds = asyncProcessRecGroup.map(rec => rec.Id)

          deleteQueueItems(sfAuthDetails, groupedAsyncProcessRecIds)

          val emailIds = asyncProcessRecGroup.map(rec => rec.Record_Id__c)

          for {
            emailsFromSF <- getRecordsFromSF[EmailsFromSfResponse.Response](
              sfAuthDetails,
              config.sfConfig.apiVersion,
              GetEmailsQuery(emailIds),
              batchSize = 200
            )

          } yield processEmails(sfAuthDetails, emailsFromSF, config.s3Config.bucketName)
        }
      }
    }
  }

  def batchAsyncProcessRecs(asyncProcessRecs: Seq[AsyncProcessRecsFromSfResponse.Records], batchSize: Integer): Seq[Seq[AsyncProcessRecsFromSfResponse.Records]] = {
    asyncProcessRecs.grouped(batchSize).toList
  }
  
  def deleteQueueItems(sfAuthDetails: SfAuthDetails, recordIds: Seq[String]): Any = {
    val deleteAttempts = for {
      deletedRecs <- deleteAsyncProcessRecs(
        sfAuthDetails,
        recordIds
      )
    } yield deletedRecs

    deleteAttempts match {
      case Left(ex) => {
        logger.error(s"error:$ex")
      }
      case Right(success) => {
        success.foreach(a => a.success.getOrElse(None) match {
          case true => {
            logger.info(s"Queue Item:${a.id} deleted")
          }
          case false => {
            logger.error(s"Failed to delete Queue Item:${a}")
          }
          case none => {
            logger.error(s"Failed to delete Queue Items. Message:${a.message.getOrElse("Something went wrong")}. ErrorCode:${a.errorCode.getOrElse("No Error Code provided")}")
          }
        })
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
                CustomFailure.toMetric(
                  "failed_writeback_to_sf_record",
                  s"Failed to write back to sf for record:$responseArrayItem"
                )
              }
              case none => {
                CustomFailure.toMetric(
                  "failed_writeback_request_to_sf",
                  s"Failed write back Request. errorCode(${responseArrayItem.errorCode}), message: ${responseArrayItem.message}"
                )
              }
            }
        )
      )
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

  def safely[A](doSomething: => A): Either[CustomFailure, A] =
    Try(doSomething).toEither.left.map(CustomFailure.fromThrowable)

  def safelyWithMetric[A](doSomething: => A)(eventName: String): Either[CustomFailure, A] =
    Try(doSomething).toEither.left.map(CustomFailure.fromThrowableToMetric(_, eventName))
}
