package com.gu.effects

import java.io.{ByteArrayInputStream, InputStream}

import com.amazonaws.services.s3.model.{CannedAccessControlList, ObjectMetadata, PutObjectRequest}
import com.amazonaws.util.IOUtils
import com.gu.test.EffectsTest
import org.scalatest.{AsyncFlatSpec, BeforeAndAfterAll, Ignore, Matchers}

import scala.util.Success
//Todo this test should be in the effects project but we need to refactor to be able to access the effectsTest tag from there

class S3EffectsTest extends AsyncFlatSpec with Matchers {
  val testBucket = BucketName("support-service-lambdas-test")

  def put(key: String, content: String) = {
    val stream: InputStream = new ByteArrayInputStream(content.getBytes(java.nio.charset.StandardCharsets.UTF_8.name))
    val bytes = IOUtils.toByteArray(stream)
    val uploadMetadata = new ObjectMetadata()
    uploadMetadata.setContentLength(bytes.length.toLong)

    val putRequest = new PutObjectRequest(
      "support-service-lambdas-test",
      key,
      new ByteArrayInputStream(bytes),
      uploadMetadata
    ).withCannedAcl(CannedAccessControlList.BucketOwnerRead)
    RawEffects.s3Write(putRequest)
  }

  def initialiseTestBucket: Unit = {
    //put test data in
    put("S3EffectsTest/test-prefix-file1", "this is file1")
    put("S3EffectsTest/test-prefix-file2", "this is file2")
    put("S3EffectsTest/ignored-prefix-file3", "this is file3")
  }

  it should "list bucket and delete" taggedAs EffectsTest in {

    initialiseTestBucket

    val testPath = S3Path(testBucket, Some(Key("S3EffectsTest/test-prefix")))

    val expectedObjectsWithPrefix = List(
      Key("S3EffectsTest/test-prefix-file1"),
      Key("S3EffectsTest/test-prefix-file2")
    )

    withClue("should list objects with a prefix") {
      ListS3Objects.listObjectsWithPrefix(testPath) shouldBe Success(expectedObjectsWithPrefix)
    }

    withClue("should delete objects with a matching prefix") {
      DeleteS3Objects.deleteObjects(testBucket, expectedObjectsWithPrefix).isSuccess shouldBe true
      ListS3Objects.listObjectsWithPrefix(testPath) shouldBe (Success(List()))
    }

    withClue("objects that do not match the deleted prefix should still be there") {
      //object with other prefixes should still be there
      val ignoredPrefixPath = testPath.copy(key = Some(Key("S3EffectsTest/ignored-prefix")))
      ListS3Objects.listObjectsWithPrefix(ignoredPrefixPath) shouldBe (Success(List(Key("S3EffectsTest/ignored-prefix-file3"))))
    }
  }
}

