package com.gu.zuora.reports

import com.amazonaws.services.s3.model.{ObjectMetadata, PutObjectRequest, PutObjectResult}
import com.gu.util.Logging
import com.gu.util.zuora.RestRequestMaker.Types._
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, DownloadStream, GenericError}
import scalaz.syntax.std.either._

import scala.util.Try

object S3ReportUpload extends Logging {

  def apply(destinationBucket: String, s3Write: PutObjectRequest => Try[PutObjectResult])(downloadStream: DownloadStream, key: String): ClientFailableOp[String] = {

    val metadata = new ObjectMetadata()
    metadata.setContentLength(downloadStream.lengthBytes)
    val putObjectRequest = new PutObjectRequest(destinationBucket, key, downloadStream.stream, metadata)
    s3Write(putObjectRequest).map(_ => s"s3://$destinationBucket/$key").toEither.disjunction.leftMap { exception =>
      logger.error("could not upload report to S3", exception)
      GenericError(s"could not upload report to S3: ${exception.getMessage}")
    }.toClientFailableOp

  }
}

