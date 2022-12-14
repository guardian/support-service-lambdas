package com.gu.sf_datalake_export.salesforce_bulk_api

import java.nio.charset.StandardCharsets

import com.gu.effects.S3Path
import com.gu.util.Logging
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.model.{ObjectCannedACL, PutObjectRequest, PutObjectResponse}

import scala.util.Try

object S3UploadFile extends Logging {

  case class FileContent(value: String) extends AnyVal
  case class FileName(value: String) extends AnyVal
  case class File(fileName: FileName, content: FileContent)
  def apply(
      s3Write: (PutObjectRequest, RequestBody) => Try[PutObjectResponse],
  )(
      basePath: S3Path,
      file: File,
  ): Try[PutObjectResponse] = {
    logger.info(s"Uploading ${file.fileName.value} to S3...")

    val fullPath = S3Path.appendToPrefix(basePath, file.fileName.value)

    val putRequest = PutObjectRequest.builder
      .bucket(fullPath.bucketName.value)
      .key(fullPath.key.map(_.value).getOrElse(""))
      .acl(ObjectCannedACL.BUCKET_OWNER_READ)
      .build()

    val requestBody = RequestBody.fromString(file.content.value, StandardCharsets.UTF_8)

    s3Write(putRequest, requestBody)

  }

}
