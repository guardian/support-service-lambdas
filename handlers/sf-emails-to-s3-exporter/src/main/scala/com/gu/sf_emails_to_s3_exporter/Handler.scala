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
    val authenticationAttempt = for {
      config <- Config.fromEnvironment.toRight("Missing config value")
      authentication <- auth(config.sfConfig)
      sfAuthDetails <- decode[SfAuthDetails](authentication)
    } yield fetchQueueItemsFromSfAndThenExportEmailsToS3(sfAuthDetails: SfAuthDetails, config: Config)

    authenticationAttempt match {
      case Left(ex) => {
        CustomFailure.toMetric(
          "failed_to_authenticate_with_sf",
          s"Failed to authenticate with SF. Error:${ex}"
        )
      }
      case Right(_) => {}
    }
  }

  def fetchQueueItemsFromSfAndThenExportEmailsToS3(sfAuthDetails: SfAuthDetails, config: Config): Unit = {
    for {
      queueItems <- fetchQueueItemsFromSf(sfAuthDetails, config)
    } yield deleteQueueItemsAndThenExportEmailsFromSfToS3InBatches(sfAuthDetails, config, batchQueueItems(queueItems, batchSize = 2000))
  }

  def deleteQueueItemsAndThenExportEmailsFromSfToS3InBatches(sfAuthDetails: SfAuthDetails, config: Config, batchedQueueItems: Seq[Seq[QueueItemsFromSfResponse.QueueItem]]): Any = { //Either[CustomFailure, Seq[QueueItemsFromSfResponse.QueueItem]] = {

    batchedQueueItems.map { queueItemBatch =>
      deleteQueueItems(sfAuthDetails, queueItemBatch.map(record => record.Id))

      fetchBatchOfEmailsFromSfAndThenExportToS3(
        sfAuthDetails,
        config,
        queueItemBatch.map(record => record.Record_Id__c)
      )
    }
  }

  def fetchBatchOfEmailsFromSfAndThenExportToS3(sfAuthDetails: SfAuthDetails, config: Config, emailIds: Seq[String]): Unit = {
    val getEmailsAttempt = for {
      emailsFromSF <- getRecordsFromSF[EmailsFromSfResponse.Response](
        sfAuthDetails,
        config.sfConfig.apiVersion,
        GetEmailsQuery(emailIds),
        batchSize = 200
      )

    } yield emailsFromSF

    getEmailsAttempt match {
      case Left(ex) => {
        CustomFailure.toMetric(
          "failed_to_get_records_from_sf",
          s"Failed to get records from SF. Error:${ex.getMessage}"
        )
      }
      case Right(batchOfEmailsFromSf) => {
        saveBatchOfEmailsToS3AndThenWritebackSuccessesToSf(sfAuthDetails, batchOfEmailsFromSf, config.s3Config.bucketName)
        logger.info("Processing complete")
      }
    }
  }

  def saveBatchOfEmailsToS3AndThenWritebackSuccessesToSf(sfAuthDetails: SfAuthDetails, batchOfEmailsFromSf: EmailsFromSfResponse.Response, bucketName: String): Any = {
    logger.info(s"Start processing ${batchOfEmailsFromSf.records.size} emails...")

    val emailIdsSuccessfullySavedToS3 = saveBatchOfEmailsToS3(batchOfEmailsFromSf, bucketName)

    if (!emailIdsSuccessfullySavedToS3.isEmpty) {
      writebackSuccessesToSf(sfAuthDetails, emailIdsSuccessfullySavedToS3).map(responseArray =>

        responseArray.map(responseArrayItem =>

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
          }))
    }
  }

  def saveBatchOfEmailsToS3(emailsDataFromSF: EmailsFromSfResponse.Response, bucketName: String): Seq[String] = {

    val saveToS3Attempts = for {
      saveToS3Attempt <- emailsDataFromSF
        .records
        .map(email => saveEmailToS3(email, bucketName))
    } yield saveToS3Attempt

    saveToS3Attempts.collect { case Right(value) => value }
  }

  def fetchQueueItemsFromSf(sfAuthDetails: SfAuthDetails, config: Config): Either[CustomFailure, Seq[QueueItemsFromSfResponse.QueueItem]] = {
    val getQueueItemsAttempt = for {
      sfQueueItems <- getRecordsFromSF[QueueItemsFromSfResponse.Response](
        sfAuthDetails,
        config.sfConfig.apiVersion,
        GetQueueItemsQuery.query,
        batchSize = 2000
      )
    } yield sfQueueItems

    getQueueItemsAttempt match {
      case Left(ex) => {
        Left(CustomFailure.toMetric(
          "failed_to_get_records_from_sf",
          s"Failed to get Queue Items from Async Process Record Object in SF. Error:${ex}"
        ))
      }
      case Right(success) => {
        logger.info(s"${success.records.size} Queue items retrieved from Salesforce")
        Right(success.records)
      }
    }
  }

  def batchQueueItems(queueItems: Seq[QueueItemsFromSfResponse.QueueItem], batchSize: Integer): Seq[Seq[QueueItemsFromSfResponse.QueueItem]] = {
    queueItems.grouped(batchSize).toList
  }

  def deleteQueueItems(sfAuthDetails: SfAuthDetails, recordIds: Seq[String]): Unit = {
    val deleteAttempts = for {
      deletedRecs <- deleteQueueItemsInSf(
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

  def safely[A](doSomething: => A): Either[CustomFailure, A] =
    Try(doSomething).toEither.left.map(CustomFailure.fromThrowable)

  def safelyWithMetric[A](doSomething: => A)(eventName: String): Either[CustomFailure, A] =
    Try(doSomething).toEither.left.map(CustomFailure.fromThrowableToMetric(_, eventName))
}
