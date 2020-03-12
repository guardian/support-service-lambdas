package com.gu.zuora.sar

import java.util.UUID.randomUUID

import cats.effect.IO
import com.amazonaws.services.s3.model.{CannedAccessControlList, ObjectMetadata, PutObjectRequest}
import com.typesafe.scalalogging.LazyLogging
import com.gu.effects.{BucketName, CopyS3Objects, Key, ListS3Objects, S3Location, S3Path, UploadToS3}
import com.gu.util.resthttp.RestRequestMaker.DownloadStream
import com.gu.zuora.{ZuoraAccountSuccess, ZuoraSarError, ZuoraSarSuccess}
import cats.syntax.traverse._
import cats.instances.list._
import cats.instances.either._

import scala.util.{Failure, Success}

sealed trait S3Response extends ZuoraSarSuccess

sealed trait S3StatusResponse

case class S3CompletedPathFound(resultLocations: List[String])
    extends S3StatusResponse

case class S3FailedPathFound() extends S3StatusResponse

case class S3NoResultsFound() extends S3StatusResponse

case class S3WriteSuccess() extends S3Response

case class S3Error(message: String) extends ZuoraSarError

trait S3Service {
  def checkForResults(initiationId: String, config: ZuoraSarConfig): IO[S3StatusResponse]
  def writeFailedResult(initiationId: String, zuoraError: ZuoraSarError, config: ZuoraSarConfig): Either[S3Error, S3WriteSuccess]
  def writeSuccessAccountResult(initiationId: String, zuoraSuccess: ZuoraAccountSuccess, config: ZuoraSarConfig): Either[S3Error, S3WriteSuccess]
  def writeSuccessInvoiceResult(initiationId: String, zuoraSuccess: List[DownloadStream], config: ZuoraSarConfig): Either[S3Error, List[S3WriteSuccess]]
}

object S3Helper extends S3Service with LazyLogging {

  override def checkForResults(
      initiationId: String,
      config: ZuoraSarConfig): IO[S3StatusResponse] =
    IO.fromTry {

      val completedPath = S3Path(BucketName(config.resultsBucket), Some(Key(s"${config.resultsPath}/$initiationId/completed/")))
      val failedPath = S3Path(BucketName(config.resultsBucket), Some(Key(s"${config.resultsPath}/$initiationId/failed/")))
      for {
        completedResults <- ListS3Objects.listObjectsWithPrefix(completedPath)
        failedResults <- ListS3Objects.listObjectsWithPrefix(failedPath)
        failedSarExists = failedResults.nonEmpty
      } yield {
        val completedFileExists = completedResults.exists(k => k.value.contains("ResultsCompleted"))
        if (failedSarExists) {
          S3FailedPathFound()
        } else if (completedFileExists) {
          S3CompletedPathFound(completedResults.filterNot(k => k.value.contains("ResultsCompleted")).map(_.value))
        } else {
          S3NoResultsFound()
        }
      }
    }

  private def createCompletedObject(keySuffix: String, initiationReference: String, config: ZuoraSarConfig): Either[S3Error, S3WriteSuccess] = {
    val completedPath =s"${config.resultsPath}/$initiationReference/completed/$keySuffix"
    UploadToS3
      .putStringWithAcl(
        S3Location(config.resultsBucket, completedPath),
        CannedAccessControlList.BucketOwnerRead,
        ""
      ) match {
      case Failure(err) => Left(S3Error(err.getMessage))
      case Success(_) => Right(S3WriteSuccess())
    }
  }

  def copyResultsToCompleted(initiationReference: String, config: ZuoraSarConfig): Either[S3Error, S3WriteSuccess] = {
    val pendingPath = S3Path(BucketName(config.resultsBucket), Some(Key(s"${config.resultsPath}/$initiationReference/pending/")))
    val pendingObjects = ListS3Objects.listObjectsWithPrefix(pendingPath)
    pendingObjects match {
      case Failure(err) => Left(S3Error(err.getMessage))
      case Success(pendingKeys) => {
        if (pendingKeys.isEmpty) {
          logger.info("No results found in /pending")
          createCompletedObject("NoResultsFoundForUser.", initiationReference, config)
        } else {
          pendingKeys.traverse { pendingKey =>
            val completedKey = pendingKey.value.replace("pending", "completed")
            for {
              _ <- CopyS3Objects
                .copyStringWithAcl(
                  S3Location(config.resultsBucket, pendingKey.value),
                  S3Location(config.resultsBucket, completedKey),
                  CannedAccessControlList.BucketOwnerRead).toEither.left.map(err => S3Error(err.getMessage))
              _ <- createCompletedObject("ResultsCompleted", initiationReference, config)
            } yield {}
          }
        }.map(_ => S3WriteSuccess())
      }
    }
  }

  override def writeFailedResult(
      initiationId: String,
      zuoraError: ZuoraSarError,
      config: ZuoraSarConfig): Either[S3Error, S3WriteSuccess] = {
    val resultsPath = s"${config.resultsPath}/$initiationId/failed/$randomUUID"
    UploadToS3.putStringWithAcl(
      S3Location(config.resultsBucket, resultsPath),
      CannedAccessControlList.BucketOwnerRead,
      zuoraError.toString) match {
      case Failure(err) => Left(S3Error(err.getMessage))
      case Success(_) => Right(S3WriteSuccess())
    }
  }

  override def writeSuccessAccountResult(
    initiationId: String,
    zuoraSarResponse: ZuoraAccountSuccess,
    config: ZuoraSarConfig): Either[S3Error, S3WriteSuccess] = {
    val resultsPath = s"${config.resultsPath}/$initiationId/pending/$randomUUID"
    for {
      _ <- UploadToS3
        .putStringWithAcl(
          S3Location(config.resultsBucket, resultsPath),
          CannedAccessControlList.BucketOwnerRead,
          zuoraSarResponse.accountSummary.toString).toEither.left.map(err => S3Error(err.getMessage))
      _ <- UploadToS3
        .putStringWithAcl(
          S3Location(config.resultsBucket, resultsPath),
          CannedAccessControlList.BucketOwnerRead,
          zuoraSarResponse.accountObj.toString).toEither.left.map(err => S3Error(err.getMessage))
    } yield S3WriteSuccess()
  }

  override def writeSuccessInvoiceResult(
      initiationId: String,
      zuoraInvoiceStreams: List[DownloadStream],
      config: ZuoraSarConfig): Either[S3Error, List[S3WriteSuccess]] = {
    zuoraInvoiceStreams.traverse { invoiceStream =>
      val metadata = new ObjectMetadata()
      metadata.setContentLength(invoiceStream.lengthBytes)
      val resultsPath = s"${config.resultsPath}/$initiationId/pending/$randomUUID"
      val uploadRequest = new PutObjectRequest(config.resultsBucket, resultsPath, invoiceStream.stream, metadata)
      UploadToS3.putObject(uploadRequest) match {
        case Failure(err) => Left(S3Error(err.getMessage))
        case Success(_) => Right(S3WriteSuccess())
      }
    }
  }
}