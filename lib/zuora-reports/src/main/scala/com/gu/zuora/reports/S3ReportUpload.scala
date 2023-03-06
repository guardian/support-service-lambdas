package com.gu.zuora.reports

import com.gu.util.Logging
import com.gu.util.resthttp.RestRequestMaker.DownloadStream
import com.gu.util.resthttp.Types.{ClientFailableOp, GenericError}
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.model.{PutObjectRequest, PutObjectResponse}

import scala.util.Try

object S3ReportUpload extends Logging {

  def apply(
      destinationBucket: String,
      s3Write: (PutObjectRequest, RequestBody) => Try[PutObjectResponse],
  )(downloadStream: DownloadStream, key: String): ClientFailableOp[String] = {
    val putObjectRequest = PutObjectRequest.builder
      .bucket(destinationBucket)
      .key(key)
      .build()
    val requestBody = RequestBody.fromInputStream(downloadStream.stream, downloadStream.lengthBytes)
    s3Write(putObjectRequest, requestBody)
      .map(_ => s"s3://$destinationBucket/$key")
      .toEither
      .left
      .map { exception =>
        logger.error("could not upload report to S3", exception)
        GenericError(s"could not upload report to S3: ${exception.getMessage}")
      }
      .toClientFailableOp

  }
}
