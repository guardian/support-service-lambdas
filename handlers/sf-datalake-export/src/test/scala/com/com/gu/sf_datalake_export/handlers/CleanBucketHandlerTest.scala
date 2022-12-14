package com.com.gu.sf_datalake_export.handlers

import com.gu.effects.{BucketName, Key, S3Path}
import com.gu.sf_datalake_export.handlers.CleanBucketHandler
import com.gu.sf_datalake_export.handlers.DownloadBatchHandler.WireState
import com.gu.sf_datalake_export.handlers.StartJobHandler.ShouldUploadToDataLake
import com.gu.sf_datalake_export.salesforce_bulk_api.BulkApiParams.ObjectName
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResult.JobName
import com.gu.util.handlers.LambdaException

import scala.util.{Failure, Success}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class CleanBucketHandlerTest extends AnyFlatSpec with Matchers {

  val wireState = WireState(
    jobName = "someJobName",
    objectName = "someObjectName",
    jobId = "SomeJobId",
    batches = Nil,
    uploadToDataLake = true,
  )

  "handleCleanBucket" should "return the same state it received as input on successful execution" in {
    def successfulCleanBucket(o: ObjectName, j: JobName, s: ShouldUploadToDataLake) = {
      o shouldBe ObjectName("someObjectName")
      j shouldBe JobName("someJobName")
      s shouldBe ShouldUploadToDataLake(true)
      Success(())
    }

    CleanBucketHandler.handleCleanBucket(successfulCleanBucket)(wireState) shouldBe Success(wireState)
  }

  it should "return failure if cleaning bucket fails" in {
    val failureResponse = Failure(LambdaException("something broke!"))

    def failedCleanBucket(o: ObjectName, j: JobName, s: ShouldUploadToDataLake) = failureResponse

    CleanBucketHandler.handleCleanBucket(failedCleanBucket)(wireState) shouldBe failureResponse
  }

  val testBasePath = S3Path(BucketName("bucketName"), Some(Key("basepath-")))
  val testKeys = List(Key("key1"), Key("key2"))

  def basePathFor(o: ObjectName, s: ShouldUploadToDataLake) = testBasePath

  def listObjectsWithPrefix(path: S3Path) = {
    path shouldBe S3Path(
      bucketName = BucketName("bucketName"),
      key = Some(Key("basepath-jobName")),
    )
    Success(testKeys)
  }

  def deleteObjects(bucket: BucketName, keys: List[Key]) = {
    bucket shouldBe testBasePath.bucketName
    keys shouldBe testKeys
    Success(())
  }

  "cleanBucket" should "clean the right files from the bucket" in {
    val wiredCleanBucket = CleanBucketHandler.cleanBucket(
      basePathFor,
      listObjectsWithPrefix,
      deleteObjects,
    ) _

    wiredCleanBucket(ObjectName("something"), JobName("jobName"), ShouldUploadToDataLake(true)) shouldBe Success(())
  }

  "cleanBucket" should "return success if there's no files to clean" in {

    val wiredCleanBucket = CleanBucketHandler.cleanBucket(
      basePathFor = basePathFor,
      listObjectsWithPrefix = (p: S3Path) => Success(Nil),
      deleteObjects = deleteObjects,
    ) _

    wiredCleanBucket(ObjectName("something"), JobName("jobName"), ShouldUploadToDataLake(true)) shouldBe Success(())
  }
}
