package com.gu.sf_datalake_export.salesforce_bulk_api

import java.io.{ByteArrayInputStream, InputStream}

import com.amazonaws.services.s3.model._
import com.amazonaws.util.IOUtils
import com.gu.effects.{BucketName, Key}
import com.gu.util.Logging

import scala.util.Try
object S3UploadFile extends Logging {
//TODO MAYBE KEYS COULD BE OPTIONS INSTEAD OF EMPTY STRINGS WHEN THEY ARE NOT NEEDED
  case class BasePath(bucketName: BucketName, keyPrefix: Key)

  case class FileContent(value: String) extends AnyVal
  case class FileName(value: String) extends AnyVal
  case class File(fileName: FileName, content: FileContent)
  def apply(
    s3Write: PutObjectRequest => Try[PutObjectResult]
  )(
    basePath: BasePath,
    file: File
  ): Try[PutObjectResult] = {
    logger.info(s"Uploading ${file.fileName.value} to S3...")
    val stream: InputStream = new ByteArrayInputStream(file.content.value.getBytes(java.nio.charset.StandardCharsets.UTF_8.name))
    val bytes = IOUtils.toByteArray(stream)
    val uploadMetadata = new ObjectMetadata()
    uploadMetadata.setContentLength(bytes.length.toLong)
    val putRequest = new PutObjectRequest(
      basePath.bucketName.value,
      basePath.keyPrefix + "/ " + file.fileName.value, //TODO VERIFY THAT THIS WORKS WITH EMPTY KEYS
      new ByteArrayInputStream(bytes),
      uploadMetadata
    ).withCannedAcl(CannedAccessControlList.BucketOwnerRead)

    s3Write(putRequest)

  }

}
