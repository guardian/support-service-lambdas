package com.gu.zuora.retention.filterCandidates

import com.amazonaws.services.s3.model.{PutObjectRequest, PutObjectResult}
import com.gu.util.handlers.LambdaException
import org.scalatest.{FlatSpec, Matchers}

import scala.util.{Failure, Success, Try}

class UploadToS3Test extends FlatSpec with Matchers {

  def s3Write(req: PutObjectRequest) = {

    val uploadData = scala.io.Source.fromInputStream(req.getInputStream).mkString
    val dataLength = uploadData.getBytes.length
    if (req.getBucketName == "testBucket" && uploadData == "some\ndata" && req.getMetadata.getContentLength == dataLength)
      Success(new PutObjectResult())
    else
      Failure(LambdaException("wrong params!"))
  }

  def uploadtoS3 = UploadToS3(s3Write, "testBucket") _
  it should "upload stream to s3 with the right params" in {
    val it = List("some", "data").iterator
    uploadtoS3(it, "fileName") shouldBe (Success("s3://testBucket/fileName"))
  }
}
