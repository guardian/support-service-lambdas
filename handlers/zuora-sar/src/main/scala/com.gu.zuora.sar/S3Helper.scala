package com.gu.zuora.sar

import cats.effect.IO
import com.typesafe.scalalogging.LazyLogging
import com.gu.effects.{BucketName, Key, ListS3Objects, S3Path}
import com.gu.zuora.sar.S3Helper.{ZuoraError, ZuoraSuccess}

sealed trait S3Response

sealed trait S3StatusResponse

case class S3CompletedPathFound(resultLocations: List[String])
    extends S3StatusResponse

case class S3FailedPathFound() extends S3StatusResponse

case class S3NoResultsFound() extends S3StatusResponse

case class S3WriteSuccess() extends S3Response

case class S3Error(message: String) extends S3Response

trait S3Service {
  def checkForResults(initiationId: String, config: SarLambdaConfig): IO[S3StatusResponse]
  def writeFailedResult(initiationId: String, zuoraError: ZuoraError, config: PerformSarLambdaConfig): IO[S3Response]
  def writeSuccessResult(initiationId: String, zuoraSuccess: ZuoraSuccess, config: PerformSarLambdaConfig): IO[S3Response]
}

object S3Helper extends S3Service with LazyLogging {

  override def checkForResults(
      initiationId: String,
      config: SarLambdaConfig): IO[S3StatusResponse] =
    IO.fromTry {

      val completedPath = S3Path(BucketName(config.resultsBucket), Some(Key(s"${config.resultsPath}/$initiationId/completed/")))
      val failedPath = S3Path(BucketName(config.resultsBucket), Some(Key(s"${config.resultsPath}/$initiationId/failed/")))
      for {
        completedResults <- ListS3Objects.listObjectsWithPrefix(completedPath)
        failedResults <- ListS3Objects.listObjectsWithPrefix(failedPath)
        failedSarExists = failedResults.nonEmpty
      } yield {
        // TODO: Maybe check if a certain file exists to know if all completed copying over
        if (completedResults.nonEmpty) {
          S3CompletedPathFound(completedResults.map(_.value))
        } else if (failedSarExists) {
          S3FailedPathFound()
        } else {
          S3NoResultsFound()
        }
      }
    }

  private def copyResultsToCompleted(resultsBucket: String,
                             pendingPath: String,
                             completedPath: String): Unit = {
    ???
  }

  case class ZuoraError()
  case class ZuoraSuccess()

  override def writeFailedResult(
      initiationId: String,
      zuoraError: ZuoraError,
      config: PerformSarLambdaConfig): IO[S3Response] = IO {
    ???
  }

  override def writeSuccessResult(
      initiationId: String,
      zuoraSuccess: ZuoraSuccess,
      config: PerformSarLambdaConfig): IO[S3Response] = IO {
    ???
  }
}