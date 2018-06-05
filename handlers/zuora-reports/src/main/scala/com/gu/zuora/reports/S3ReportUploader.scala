package com.gu.zuora.reports

import com.amazonaws.services.s3.model.{ObjectMetadata, PutObjectRequest, PutObjectResult}
import com.gu.util.config.Stage
import com.gu.util.zuora.RestRequestMaker.DownloadStream

import scala.util.Try

object S3ReportUploader {
  val buckets = Map(Stage("CODE") -> "zuora-reports-code", Stage("PROD") -> "zuora-reports-prod")

  def apply(
    stage: Stage,
    s3Write: PutObjectRequest => Try[PutObjectResult]
  )(
    downloadStream: DownloadStream,
    queryName: String
  ): Try[String] = {
    val metadata = new ObjectMetadata()
    metadata.setContentLength(downloadStream.lengthBytes)
    val destBucket = buckets(stage)
    val destKey = s"${queryName}.csv" //todo do we want any type of directory structure to save the files ?
    val putObjectRequest = new PutObjectRequest(destBucket, queryName, downloadStream.stream, metadata)
    s3Write(putObjectRequest).map(_ => s"$destBucket/$destKey")
  }
}
