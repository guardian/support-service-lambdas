package com.gu.catalogService

import java.io.{ByteArrayInputStream, InputStream}
import com.amazonaws.services.s3.model.{ObjectMetadata, PutObjectRequest, PutObjectResult}
import com.amazonaws.util.IOUtils
import com.gu.util.Logging
import com.gu.util.config.Stage
import scala.util.Try
import scalaz.{-\/, \/, \/-}

object S3UploadCatalog extends Logging {

  def apply(
    stage: Stage,
    catalog: String,
    s3Write: PutObjectRequest => Try[PutObjectResult]
  ): String \/ PutObjectResult = {
    logger.info("Uploading catalog to S3...")
    val stream: InputStream = new ByteArrayInputStream(catalog.getBytes(java.nio.charset.StandardCharsets.UTF_8.name))
    val bytes = IOUtils.toByteArray(stream)
    val uploadMetadata = new ObjectMetadata()
    uploadMetadata.setContentLength(bytes.length.toLong)
    val putRequest = new PutObjectRequest(s"gu-zuora-catalog/${stage.value}", "catalog.json", new ByteArrayInputStream(bytes), uploadMetadata)
    val uploadAttempt = for {
      result <- s3Write(putRequest)
    } yield {
      result
    }
    uploadAttempt.fold(
      ex => {
        logger.error(s"Upload failed due to $ex")
        -\/(s"Upload failed due to $ex")
      },
      result => {
        logger.info(s"Successfully uploaded catalog to S3: $result")
        \/-(result)
      }
    )
  }

}
