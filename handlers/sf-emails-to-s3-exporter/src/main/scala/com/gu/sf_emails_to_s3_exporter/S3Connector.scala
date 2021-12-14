package com.gu.sf_emails_to_s3_exporter

import java.nio.charset.StandardCharsets

import com.gu.effects.UploadToS3
import com.typesafe.scalalogging.LazyLogging
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.model.{PutObjectRequest, PutObjectResponse}

import scala.util.Try

object S3Connector extends LazyLogging{

  def writeEmailsJsonToS3(fileName: String, caseEmailsJson: String): Unit = {

    val putRequest = PutObjectRequest.builder
      .bucket("emails-from-sf")
      .key(s"${fileName}.json")
      .build()

    val requestBody = RequestBody.fromString(caseEmailsJson, StandardCharsets.UTF_8)

    val uploadAttempt = for {
      result <- s3Write(putRequest, requestBody)
    } yield {
      result
    }
    uploadAttempt.fold(
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
  def s3Write: (PutObjectRequest, RequestBody) => Try[PutObjectResponse] = UploadToS3.putObject
}
