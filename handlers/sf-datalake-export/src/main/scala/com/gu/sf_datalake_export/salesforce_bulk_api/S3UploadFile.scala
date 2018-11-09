package com.gu.sf_datalake_export.salesforce_bulk_api

import java.io.{ByteArrayInputStream, InputStream}

import com.amazonaws.services.s3.model.{ObjectMetadata, PutObjectRequest, PutObjectResult}
import com.amazonaws.util.IOUtils
import com.gu.util.Logging
import com.gu.util.config.{Stage, ZuoraEnvironment}
import scalaz.{-\/, \/, \/-}

import scala.util.Try
//todo maybe this is becoming a little bit too close to a generic s3 uploader and could be extracted to dedup with catalog service
object S3UploadFile extends Logging {

  case class FileContent(value: String) extends AnyVal
  case class FileName(value: String) extends AnyVal
  case class File(fileName: FileName, content: FileContent)
  def apply(
    stage: Stage,
    s3Write: PutObjectRequest => Try[PutObjectResult],
    file: File
  ): String \/ PutObjectResult = {
    logger.info(s"Uploading ${file.fileName.value} to S3...")
    val stream: InputStream = new ByteArrayInputStream(file.content.value.getBytes(java.nio.charset.StandardCharsets.UTF_8.name))
    val bytes = IOUtils.toByteArray(stream)
    val uploadMetadata = new ObjectMetadata()
    uploadMetadata.setContentLength(bytes.length.toLong)
    val putRequest = new PutObjectRequest(
      s"gu-salesforce-export-test/${stage.value}/raw",
      file.fileName.value,
      new ByteArrayInputStream(bytes),
      uploadMetadata
    )
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
        logger.info(s"Successfully uploaded to S3: $result")
        \/-(result)
      }
    )
  }

}
