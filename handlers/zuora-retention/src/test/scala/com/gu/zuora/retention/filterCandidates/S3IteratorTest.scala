package com.gu.zuora.retention.filterCandidates

import java.io.{ByteArrayInputStream, InputStream}

import com.amazonaws.services.s3.model.GetObjectRequest
import org.scalatest.{FlatSpec, Matchers}

import scala.util.{Failure, Success, Try}

class S3IteratorTest extends FlatSpec with Matchers {
  val testContent = "some test content"

  it should "parse Uri correctly" in {
    def fakeFetchContent(req: GetObjectRequest): Try[InputStream] = {
      if (req.getBucketName == "testbucket" && req.getKey == "some/key.csv")
        Success(new ByteArrayInputStream(testContent.getBytes))
      else Failure(new RuntimeException("wrong Params"))
    }

    S3Iterator(fakeFetchContent)("s3://testbucket/some/key.csv").map(_.mkString) shouldBe Success(testContent)

  }

}

