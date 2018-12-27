package com.com.gu.sf_datalake_export.salesforce_bulk_api

import com.amazonaws.services.s3.model.{CannedAccessControlList, PutObjectRequest, PutObjectResult}
import com.gu.effects.{BucketName, S3Path}
import com.gu.sf_datalake_export.salesforce_bulk_api.S3UploadFile
import com.gu.sf_datalake_export.salesforce_bulk_api.S3UploadFile.{File, FileContent, FileName}
import org.scalatest.{FlatSpec, Matchers}

import scala.util.{Success, Try}

class S3UploadFileTest extends FlatSpec with Matchers{
  val testPath = S3Path(BucketName("someBucket"), None)
  val testFile = File(FileName("someName"), FileContent("these are the file contents"))
  val successS3Result = Success(new PutObjectResult())
  var numberOfS3Writes = 0

  def fakeS3Write(putRequest: PutObjectRequest): Try[PutObjectResult] = {
    numberOfS3Writes = numberOfS3Writes + 1
    putRequest.getBucketName shouldBe testPath.bucketName.value
    putRequest.getCannedAcl shouldBe CannedAccessControlList.BucketOwnerRead
    val fileContent = scala.io.Source.fromInputStream(putRequest.getInputStream).mkString
    fileContent shouldBe testFile.content.value
    successS3Result

  }

  it should "upload file" in {
    S3UploadFile(fakeS3Write)(testPath, testFile) shouldBe successS3Result
    numberOfS3Writes shouldBe 1
  }

}
