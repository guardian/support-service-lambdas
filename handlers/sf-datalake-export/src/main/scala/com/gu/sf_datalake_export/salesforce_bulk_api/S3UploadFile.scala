package com.gu.sf_datalake_export.salesforce_bulk_api

import java.io.{ByteArrayInputStream, InputStream}

import com.amazonaws.services.s3.model._
import com.amazonaws.util.IOUtils
import com.gu.effects.S3Path
import com.gu.util.Logging

import scala.util.Try
object S3UploadFile extends Logging {

  case class FileContent(value: String) extends AnyVal
  case class FileName(value: String) extends AnyVal
  case class File(fileName: FileName, content: FileContent)
  def apply(
    s3Write: PutObjectRequest => Try[PutObjectResult]
  )(
    basePath: S3Path,
    file: File
  ): Try[PutObjectResult] = {
    logger.info(s"Uploading ${file.fileName.value} to S3...")
    val stream: InputStream = new ByteArrayInputStream(file.content.value.getBytes(java.nio.charset.StandardCharsets.UTF_8.name))
    val bytes = IOUtils.toByteArray(stream)
    val uploadMetadata = new ObjectMetadata()
    uploadMetadata.setContentLength(bytes.length.toLong)
    val fullPath = S3Path.appendToPrefix(basePath, file.fileName.value)
    val putRequest = new PutObjectRequest(
      fullPath.bucketName.value,
      fullPath.key.map(_.value).getOrElse(""),
      new ByteArrayInputStream(bytes),
      uploadMetadata
    ).withCannedAcl(CannedAccessControlList.BucketOwnerRead)

    s3Write(putRequest)

  }

}
