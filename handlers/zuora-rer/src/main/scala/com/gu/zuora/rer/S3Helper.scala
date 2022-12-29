package com.gu.zuora.rer

import java.util.UUID.randomUUID
import com.typesafe.scalalogging.LazyLogging
import com.gu.effects.{BucketName, CopyS3Objects, Key, ListS3Objects, S3Location, S3Path, UploadToS3}
import com.gu.util.resthttp.RestRequestMaker.DownloadStream
import cats.syntax.traverse._
import play.api.libs.json.JsValue
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.model.{ObjectCannedACL, PutObjectRequest}

import scala.util.{Failure, Success, Try}

sealed trait S3Response

sealed trait S3StatusResponse

case class S3CompletedPathFound(resultLocations: List[String])
  extends S3StatusResponse

case class S3FailedPathFound() extends S3StatusResponse

case class S3NoResultsFound() extends S3StatusResponse

case class S3WriteSuccess() extends S3Response

case class S3Error(message: String) extends ZuoraRerError

case class InvoiceId(id: String)
case class InvoiceIds(invoices: List[InvoiceId])

case class ZuoraAccountSuccess(accountSummary: JsValue, accountObj: JsValue, invoiceList: InvoiceIds)

trait S3Service {
  def checkForResults(initiationId: String, config: ZuoraRerConfig): Try[S3StatusResponse]
  def copyResultsToCompleted(initiationReference: String, config: ZuoraRerConfig): Either[S3Error, S3WriteSuccess]
  def writeFailedResult(initiationId: String, zuoraError: ZuoraRerError, config: ZuoraRerConfig): Either[S3Error, S3WriteSuccess]
  def writeSuccessAccountResult(initiationId: String, zuoraSuccess: ZuoraAccountSuccess, config: ZuoraRerConfig): Either[S3Error, S3WriteSuccess]
  def writeSuccessInvoiceResult(initiationId: String, zuoraSuccess: List[DownloadStream], config: ZuoraRerConfig): Either[S3Error, List[S3WriteSuccess]]
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
      completedFileExists = completedResults.exists(k => k.value.contains("ResultsCompleted") | k.value.contains("NoResultsFoundForUser"))
    } yield {
      if (failedRerExists) {
        S3FailedPathFound()
      } else if (completedFileExists) {
        S3CompletedPathFound(completedResults.filterNot(k => k.value.contains("ResultsCompleted"))
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

  override def copyResultsToCompleted(initiationReference: String, config: ZuoraRerConfig): Either[S3Error, S3WriteSuccess] = {
    val pendingPath = S3Path(BucketName(config.resultsBucket), Some(Key(s"${config.resultsPath}/$initiationReference/pending/")))
    val pendingObjects = ListS3Objects.listObjectsWithPrefix(pendingPath)
    pendingObjects match {
      case Failure(err) => Left(S3Error(err.getMessage))
      case Success(pendingKeys) =>
        if (pendingKeys.isEmpty) {
          logger.info("No results found in /pending. Creating NoResultsFoundForUser object.")
          createCompletedObject("NoResultsFoundForUser", initiationReference, config)
        } else {
          pendingKeys.traverse { pendingKey =>
            val completedKey = pendingKey.value.replace("pending", "completed")
            CopyS3Objects
              .copyStringWithAcl(
                S3Location(config.resultsBucket, pendingKey.value),
                S3Location(config.resultsBucket, completedKey),
                ObjectCannedACL.BUCKET_OWNER_READ
              ).toEither.left.map(err => S3Error(err.getMessage))
          }
          createCompletedObject("ResultsCompleted", initiationReference, config)
        }.map(_ => S3WriteSuccess())
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

  override def writeSuccessAccountResult(
    initiationId: String,
    zuoraRerResponse: ZuoraAccountSuccess,
    config: ZuoraRerConfig
  ): Either[S3Error, S3WriteSuccess] = {
    val resultsPath = s"${config.resultsPath}/$initiationId/pending/$randomUUID"
    val accountDetails = Seq(zuoraRerResponse.accountSummary, zuoraRerResponse.accountObj).mkString("\n")
    logger.info("Uploading successful account result to S3.")
    UploadToS3.putStringWithAcl(
      S3Location(config.resultsBucket, resultsPath),
      ObjectCannedACL.BUCKET_OWNER_READ,
      accountDetails
    ).toEither.map(_ => S3WriteSuccess()).left.map(err => S3Error(err.getMessage))
  }

  override def writeSuccessInvoiceResult(
    initiationId: String,
    zuoraInvoiceStreams: List[DownloadStream],
    config: ZuoraRerConfig
  ): Either[S3Error, List[S3WriteSuccess]] = {
    logger.info("Uploading successful invoice results to S3.")
    val resultsPath = s"${config.resultsPath}/$initiationId/pending/$randomUUID"
    val uploadRequest = PutObjectRequest.builder
      .bucket(config.resultsBucket)
      .key(resultsPath)
      .build()
    zuoraInvoiceStreams.traverse { invoiceStream =>
      val requestBody = RequestBody.fromInputStream(invoiceStream.stream, invoiceStream.lengthBytes)
      UploadToS3.putObject(uploadRequest, requestBody) match {
        case Failure(err) => Left(S3Error(err.getMessage))
        case Success(_) => Right(S3WriteSuccess())
      }
    }
  }
}
