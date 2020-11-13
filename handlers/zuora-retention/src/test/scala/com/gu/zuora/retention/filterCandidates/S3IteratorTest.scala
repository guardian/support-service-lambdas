package com.gu.zuora.retention.filterCandidates

import java.io.{ByteArrayInputStream, InputStream}

import org.scalatest.{FlatSpec, Matchers}
import software.amazon.awssdk.services.s3.model.GetObjectRequest

import scala.util.{Failure, Success, Try}

class S3IteratorTest extends FlatSpec with Matchers {
  val testContent = "some test content"

  it should "parse Uri correctly" in {
    def fakeFetchContent(req: GetObjectRequest): Try[InputStream] = {
      if (req.bucket == "testbucket" && req.key == "some/key.csv")
        Success(new ByteArrayInputStream(testContent.getBytes))
      else Failure(new RuntimeException("wrong Params"))
    }

    S3Iterator(fakeFetchContent)("s3://testbucket/some/key.csv").map(_.mkString) shouldBe Success(testContent)

  }

}

