package com.gu.zuora.retention.filterCandidates

import java.nio.charset.StandardCharsets

import com.typesafe.scalalogging.LazyLogging
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.model.{PutObjectRequest, PutObjectResponse}

import scala.util.Try

object UploadToS3 extends LazyLogging {

  def apply(
      s3Write: (PutObjectRequest, RequestBody) => Try[PutObjectResponse],
      bucket: String,
  )(filteredCandidates: Iterator[String], key: String): Try[String] = {
    val uploadLocation = s"s3://$bucket/$key"
    logger.info(s"uploading do do not process list to $uploadLocation")
    val stringData = filteredCandidates.toList.mkString("\n")
    val requestBody = RequestBody.fromString(stringData, StandardCharsets.UTF_8)
    val putObjectRequest = PutObjectRequest.builder
      .bucket(bucket)
      .key(key)
      .contentLength(requestBody.contentLength)
      .build()
    s3Write(putObjectRequest, requestBody).map(_ => uploadLocation)
  }
}
