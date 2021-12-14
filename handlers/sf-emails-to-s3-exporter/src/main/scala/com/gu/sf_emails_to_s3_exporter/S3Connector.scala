package com.gu.sf_emails_to_s3_exporter

import java.nio.charset.StandardCharsets

import com.gu.effects.UploadToS3
import com.typesafe.scalalogging.LazyLogging
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.model.PutObjectRequest

object S3Connector extends LazyLogging{

  val bucketName = "emails-from-sf"

  def writeEmailsJsonToS3(fileName: String, caseEmailsJson: String): Unit = {

    val putRequest = PutObjectRequest.builder
      .bucket(bucketName)
      .key(s"${fileName}")
      .build()

    val requestBody = RequestBody.fromString(caseEmailsJson, StandardCharsets.UTF_8)

    UploadToS3.putObject(putRequest, requestBody)
      .fold(
      ex => {
        logger.info(s"Upload failed due to $ex")
        Left(s"Upload failed due to $ex")
      },
      result => {
        logger.info(s"Successfully saved Case emails ($fileName) to S3")
        Right(result)
      }
    )
  }
}
