package com.gu.catalogService

import java.io.File
import com.amazonaws.services.s3.model.{PutObjectRequest, PutObjectResult}
import com.gu.effects.FileConstructor
import com.gu.util.{Logging, Stage}
import scala.util.Try

import scalaz.{-\/, \/, \/-}

object S3UploadCatalog extends Logging {

  def apply(
    stage: Stage,
    catalog: String,
    localFileWrite: FileConstructor => Try[File],
    s3Write: PutObjectRequest => Try[PutObjectResult]
  ): String \/ PutObjectResult = {
    logger.info("Uploading catalog to S3...")
    val path = "/tmp/catalog.json" // Must use /tmp when running in a lambda
    val uploadAttempt = for {
      catalogDotJson <- localFileWrite(FileConstructor(catalog, path))
      putRequest = new PutObjectRequest(s"gu-zuora-catalog/${stage.value}", "catalog.json", catalogDotJson)
      result <- s3Write(putRequest)
    } yield {
      logger.info(s"Successfully uploaded catalog to S3: $result")
      result
    }
    uploadAttempt.fold(ex => -\/(s"Upload failed due to $ex"), result => \/-(result))
  }

}
