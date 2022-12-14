package com.gu.catalogService

import java.nio.charset.StandardCharsets

import com.gu.util.Logging
import com.gu.util.config.{Stage, ZuoraEnvironment}
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.model.{PutObjectRequest, PutObjectResponse}

import scala.util.Try

object S3UploadCatalog extends Logging {

  def apply(
      stage: Stage,
      zuoraEnvironment: ZuoraEnvironment,
      catalog: String,
      s3Write: (PutObjectRequest, RequestBody) => Try[PutObjectResponse],
  ): Either[String, PutObjectResponse] = {
    logger.info("Uploading catalog to S3...")

    val putRequest = PutObjectRequest.builder
      .bucket("gu-zuora-catalog")
      .key(s"${stage.value}/Zuora-${zuoraEnvironment.value}/catalog.json")
      .build()

    val requestBody = RequestBody.fromString(catalog, StandardCharsets.UTF_8)

    val uploadAttempt = for {
      result <- s3Write(putRequest, requestBody)
    } yield {
      result
    }
    uploadAttempt.fold(
      ex => {
        logger.error(s"Upload failed due to $ex")
        Left(s"Upload failed due to $ex")
      },
      result => {
        logger.info(s"Successfully uploaded catalog to S3: $result")
        Right(result)
      },
    )
  }

}
