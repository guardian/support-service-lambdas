package com.gu.zuora.retention.filterCandidates

import com.gu.util.handlers.LambdaException
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.model.{PutObjectRequest, PutObjectResponse}

import scala.io.Source
import scala.util.{Failure, Success}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class UploadToS3Test extends AnyFlatSpec with Matchers {

  private def s3Write(req: PutObjectRequest, body: RequestBody) = {
    val uploadData = Source.fromInputStream(body.contentStreamProvider.newStream()).mkString
    val dataLength = body.contentLength
    if (req.bucket == "testBucket" && uploadData == "some\ndata" && req.contentLength == dataLength)
      Success(PutObjectResponse.builder.build())
    else
      Failure(LambdaException("wrong params!"))
  }

  private def uploadtoS3 = UploadToS3(s3Write, "testBucket") _

  it should "upload stream to s3 with the right params" in {
    val it = List("some", "data").iterator
    uploadtoS3(it, "fileName") shouldBe Success("s3://testBucket/fileName")
  }
}
