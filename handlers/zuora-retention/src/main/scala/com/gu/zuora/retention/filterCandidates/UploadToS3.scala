package com.gu.zuora.retention.filterCandidates

import java.io.ByteArrayInputStream

import com.amazonaws.services.s3.model.{ObjectMetadata, PutObjectRequest, PutObjectResult}
import com.gu.zuora.reports.S3ReportUpload.logger

import scala.util.Try

object UploadToS3 {

  def apply(
    s3Write: PutObjectRequest => Try[PutObjectResult],
    bucket: String
  )(filteredCandidates: Iterator[String], key: String) = {
    val uploadLocation = s"s3://$bucket/$key"
    logger.info(s"uploading do do not process list to $uploadLocation")

    val stringData = filteredCandidates.toList.mkString("\n")
    val data = stringData.getBytes("UTF-8")
    val stream = new ByteArrayInputStream(data)

    val metadata = new ObjectMetadata()
    metadata.setContentLength(data.length.toLong)

    val putObjectRequest = new PutObjectRequest(bucket, key, stream, metadata)
    s3Write(putObjectRequest).map(_ => uploadLocation)
  }
}
