package com.gu.zuora.rer

import java.util.UUID.randomUUID
import com.typesafe.scalalogging.LazyLogging
import com.gu.effects.{BucketName, CopyS3Objects, Key, ListS3Objects, S3Location, S3Path, UploadToS3}
import cats.syntax.traverse._
import software.amazon.awssdk.services.s3.model.ObjectCannedACL

import scala.util.{Failure, Success, Try}

sealed trait S3Response

sealed trait S3StatusResponse

case class S3CompletedPathFound(resultLocations: List[String])
  extends S3StatusResponse

case class S3FailedPathFound() extends S3StatusResponse

case class S3NoResultsFound() extends S3StatusResponse

case class S3WriteSuccess() extends S3Response

case class S3Error(message: String) extends ZuoraRerError

trait S3Service {
  def checkForResults(initiationId: String, config: ZuoraRerConfig): Try[S3StatusResponse]
  def copyResultsToCompleted(initiationReference: String, contactList: List[ZuoraContact], config: ZuoraRerConfig): Either[S3Error, S3WriteSuccess]
  def writeFailedResult(initiationId: String, zuoraError: ZuoraRerError, config: ZuoraRerConfig): Either[S3Error, S3WriteSuccess]
}

object S3Helper extends S3Service with LazyLogging {

  override def checkForResults(
    initiationId: String,
    config: ZuoraRerConfig
  ): Try[S3StatusResponse] = {
    val completedPath = S3Path(BucketName(config.resultsBucket), Some(Key(s"${config.resultsPath}/$initiationId/completed/")))
    val failedPath = S3Path(BucketName(config.resultsBucket), Some(Key(s"${config.resultsPath}/$initiationId/failed/")))
    logger.info("Checking for failed or completed file paths in S3.")
    for {
      completedResults <- ListS3Objects.listObjectsWithPrefix(completedPath)
      failedResults <- ListS3Objects.listObjectsWithPrefix(failedPath)
      failedRerExists = failedResults.nonEmpty
      completedFileExists = completedResults.exists(k => k.value.contains("ErasureCompleted") | k.value.contains("NoResultsFoundForUser"))
    } yield {
      if (failedRerExists) {
        S3FailedPathFound()
      } else if (completedFileExists) {
        S3CompletedPathFound(completedResults
          .map(keyPath => s"s3://${config.resultsBucket}/${keyPath.value}"))
      } else {
        S3NoResultsFound()
      }
    }
  }

  private def createCompletedObject(keySuffix: String, initiationReference: String, config: ZuoraRerConfig): Either[S3Error, S3WriteSuccess] = {
    val completedPath = s"${config.resultsPath}/$initiationReference/completed/$keySuffix"
    UploadToS3
      .putStringWithAcl(
        S3Location(config.resultsBucket, completedPath),
        ObjectCannedACL.BUCKET_OWNER_READ,
        ""
      ) match {
          case Failure(err) => Left(S3Error(err.getMessage))
          case Success(_) => Right(S3WriteSuccess())
        }
  }

  override def copyResultsToCompleted(initiationReference: String, contactList: List[ZuoraContact], config: ZuoraRerConfig): Either[S3Error, S3WriteSuccess] = {
    contactList match {
      case Nil =>
        logger.info("No contacts found for the subject email. Creating NoResultsFoundForUser object.")
        createCompletedObject("NoResultsFoundForUser", initiationReference, config)
      case _ =>
        logger.info(s"Successfully scrubbed ${contactList.length} account(s). Creating ErasureCompleted object.")
        createCompletedObject("ErasureCompleted", initiationReference, config)
    }
  }

  override def writeFailedResult(
    initiationId: String,
    zuoraError: ZuoraRerError,
    config: ZuoraRerConfig
  ): Either[S3Error, S3WriteSuccess] = {
    val resultsPath = s"${config.resultsPath}/$initiationId/failed/$randomUUID"
    logger.info("Uploading file to failed path in S3.")
    UploadToS3.putStringWithAcl(
      S3Location(config.resultsBucket, resultsPath),
      ObjectCannedACL.BUCKET_OWNER_READ,
      zuoraError.toString
    ).toEither.map(_ => S3WriteSuccess()).left.map(err => S3Error(err.getMessage))
  }
}
