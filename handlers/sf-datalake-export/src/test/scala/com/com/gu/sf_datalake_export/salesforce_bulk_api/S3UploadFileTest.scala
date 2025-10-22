package com.com.gu.sf_datalake_export.salesforce_bulk_api

import com.gu.effects.{BucketName, S3Path}
import com.gu.sf_datalake_export.salesforce_bulk_api.S3UploadFile
import com.gu.sf_datalake_export.salesforce_bulk_api.S3UploadFile.{File, FileContent, FileName}
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.model.{ObjectCannedACL, PutObjectRequest, PutObjectResponse}

import scala.io.Source
import scala.util.{Success, Try}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class S3UploadFileTest extends AnyFlatSpec with Matchers {
  private val testPath = S3Path(BucketName("someBucket"), None)
  private val testFile = File(FileName("someName"), FileContent("these are the file contents"))
  private val successS3Result = Success(PutObjectResponse.builder.build())
  private var numberOfS3Writes = 0

  private def fakeS3Write(putRequest: PutObjectRequest, body: RequestBody): Try[PutObjectResponse] = {
    numberOfS3Writes = numberOfS3Writes + 1
    putRequest.bucket shouldBe testPath.bucketName.value
    val fileContent = Source.fromInputStream(body.contentStreamProvider.newStream()).mkString
    fileContent shouldBe testFile.content.value
    successS3Result

  }

  it should "upload file" in {
    S3UploadFile(fakeS3Write)(testPath, testFile) shouldBe successS3Result
    numberOfS3Writes shouldBe 1
  }

}
