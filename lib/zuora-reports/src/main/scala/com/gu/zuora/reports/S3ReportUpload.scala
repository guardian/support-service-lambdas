package com.gu.zuora.reports

import com.amazonaws.services.s3.model.{ObjectMetadata, PutObjectRequest, PutObjectResult}
import com.gu.util.Logging
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, DownloadStream, GenericError}

import scala.util.Try
import scalaz.syntax.std.either._

object S3ReportUpload extends Logging {

  def apply(destinationBucket: String, basePath: String, s3Write: PutObjectRequest => Try[PutObjectResult])(downloadStream: DownloadStream, queryName: String): ClientFailableOp[String] = {

    val metadata = new ObjectMetadata()
    metadata.setContentLength(downloadStream.lengthBytes)
    val fileName = queryName + ".csv"
    val putObjectRequest = new PutObjectRequest(destinationBucket, fileName, downloadStream.stream, metadata)
    s3Write(putObjectRequest).map(_ => s"s3://$destinationBucket/$basePath/$fileName").toEither.disjunction.leftMap { exception =>
      logger.error("could not upload report to S3", exception)
      GenericError(s"could not upload report to S3: ${exception.getMessage}")
    }

  }
}

