package com.gu.effects

import java.nio.charset.StandardCharsets

import com.gu.test.EffectsTest
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.model.{ObjectCannedACL, PutObjectRequest}

import scala.util.Success
import org.scalatest.flatspec.AsyncFlatSpec
import org.scalatest.matchers.should.Matchers
//Todo this test should be in the effects project but we need to refactor to be able to access the effectsTest tag from there

class S3EffectsTest extends AsyncFlatSpec with Matchers {
  private val testBucket = BucketName("support-service-lambdas-test")

  private def put(key: String, content: String) = {
    val putRequest = PutObjectRequest.builder
      .bucket("support-service-lambdas-test")
      .key(key)
      .acl(ObjectCannedACL.BUCKET_OWNER_READ)
      .build()
    val requestBody = RequestBody.fromString(content, StandardCharsets.UTF_8)
    RawEffects.s3Write(putRequest, requestBody)
  }

  private def initialiseTestBucket(): Unit = {
    // put test data in
    put("S3EffectsTest/test-prefix-file1", "this is file1")
    put("S3EffectsTest/test-prefix-file2", "this is file2")
    put("S3EffectsTest/ignored-prefix-file3", "this is file3")
  }

  it should "list bucket and delete" taggedAs EffectsTest in {

    initialiseTestBucket()

    val testPath = S3Path(testBucket, Some(Key("S3EffectsTest/test-prefix")))

    val expectedObjectsWithPrefix = List(
      Key("S3EffectsTest/test-prefix-file1"),
      Key("S3EffectsTest/test-prefix-file2"),
    )

    withClue("should list objects with a prefix") {
      ListS3Objects.listObjectsWithPrefix(testPath) shouldBe Success(expectedObjectsWithPrefix)
    }

    withClue("should delete objects with a matching prefix") {
      DeleteS3Objects.deleteObjects(testBucket, expectedObjectsWithPrefix).isSuccess shouldBe true
      ListS3Objects.listObjectsWithPrefix(testPath) shouldBe Success(List())
    }

    withClue("objects that do not match the deleted prefix should still be there") {
      // object with other prefixes should still be there
      val ignoredPrefixPath = testPath.copy(key = Some(Key("S3EffectsTest/ignored-prefix")))
      ListS3Objects.listObjectsWithPrefix(ignoredPrefixPath) shouldBe Success(
        List(Key("S3EffectsTest/ignored-prefix-file3")),
      )
    }
  }
}
