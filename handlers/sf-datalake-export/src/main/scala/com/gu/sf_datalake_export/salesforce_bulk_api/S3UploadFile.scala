package com.gu.sf_datalake_export.salesforce_bulk_api

import java.io.{ByteArrayInputStream, InputStream}

import com.amazonaws.services.s3.model.{ObjectMetadata, PutObjectRequest, PutObjectResult}
import com.amazonaws.util.IOUtils
import com.gu.util.Logging
import com.gu.util.config.Stage

import scala.util.Try
object S3UploadFile extends Logging {

  case class FileContent(value: String) extends AnyVal
  case class FileName(value: String) extends AnyVal
  case class File(fileName: FileName, content: FileContent)
  def apply(
    stage: Stage,
    s3Write: PutObjectRequest => Try[PutObjectResult],
    file: File
  ): Try[PutObjectResult] = {
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

    s3Write(putRequest)

  }

}
