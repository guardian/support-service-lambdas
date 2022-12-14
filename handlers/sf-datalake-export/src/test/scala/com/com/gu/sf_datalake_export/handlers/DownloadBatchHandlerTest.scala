package com.com.gu.sf_datalake_export.handlers

import com.gu.effects.{BucketName, Key, S3Path}
import com.gu.sf_datalake_export.handlers.DownloadBatchHandler
import com.gu.sf_datalake_export.handlers.DownloadBatchHandler._
import com.gu.sf_datalake_export.handlers.StartJobHandler.ShouldUploadToDataLake
import com.gu.sf_datalake_export.salesforce_bulk_api.BulkApiParams
import com.gu.sf_datalake_export.salesforce_bulk_api.BulkApiParams.ObjectName
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResult.{DownloadResultsRequest, JobName}
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResultId.{BatchResultId, GetBatchResultRequest}
import com.gu.sf_datalake_export.salesforce_bulk_api.GetJobBatches.{BatchId, BatchInfo, Completed}
import com.gu.sf_datalake_export.salesforce_bulk_api.S3UploadFile.{File, FileContent, FileName}
import com.gu.util.config.Stage
import com.gu.util.resthttp.Types.ClientSuccess
import play.api.libs.json.Json

import scala.util.{Success, Try}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class DownloadBatchHandlerTest extends AnyFlatSpec with Matchers {

  def fakeDownloadBatch(jobName: JobName, jobId: JobId, batchId: BatchId, basePath: S3Path): Try[Unit] = {
    jobName.value shouldBe "someJobName"
    jobId.value shouldBe "someJobId"
    batchId.value shouldBe "batch1"

    basePath shouldBe S3Path(BucketName("someBasePathBucket"), Some(Key("someBasePathKey")))
    Success(())
  }

  val testBasePath = S3Path(BucketName("someBasePathBucket"), Some(Key("someBasePathKey")))

  def fakeGetUploadPath(objectName: ObjectName, shouldUploadtoDataLake: ShouldUploadToDataLake) = {
    shouldUploadtoDataLake shouldBe ShouldUploadToDataLake(false)
    objectName shouldBe ObjectName("someObjectName")
    testBasePath
  }

  val stepsWithFakeDeps = DownloadBatchHandler.steps(fakeGetUploadPath, fakeDownloadBatch) _

  val batch1 = BatchInfo(BatchId("batch1"), Completed)
  val batch2 = BatchInfo(BatchId("batch2"), Completed)

  val twoBatchState = State(
    JobId("someJobId"),
    JobName("someJobName"),
    ObjectName("someObjectName"),
    List(batch1, batch2),
    ShouldUploadToDataLake(false),
    IsDone(false),
  )

  "DownloadBatches.steps" should "download first batch in request and remove it from response " in {
    val requestWithoutBatch1 = twoBatchState.copy(batches = List(batch2))
    stepsWithFakeDeps(twoBatchState) shouldBe Success(requestWithoutBatch1)
  }

  it should "set done to true if downloading last batch" in {
    val oneBatchState = twoBatchState.copy(batches = List(batch1))
    val doneResponse = oneBatchState.copy(batches = List.empty, isDone = IsDone(true))

    stepsWithFakeDeps(oneBatchState) shouldBe Success(doneResponse)
  }

  it should "set done to true if there are no batches to download" in {
    val noBatchState = twoBatchState.copy(batches = List.empty)
    val doneResponse = noBatchState.copy(isDone = IsDone(true))

    stepsWithFakeDeps(noBatchState) shouldBe Success(doneResponse)
  }

  "DownloadBatches.downloadBatch" should "download file contents and upload to s3 " in {
    def validatingUploadFile(basePath: S3Path, file: File): Try[Unit] = {
      basePath shouldBe testBasePath
      file.fileName shouldBe FileName("someJobName_someJobId_someResultId.csv")
      file.content shouldBe FileContent("someFileContent")

      Success(())
    }

    def validatingGetBatchResultId(req: GetBatchResultRequest) = {
      req.jobId shouldBe JobId("someJobId")
      req.batchId shouldBe BatchId("someBatchId")

      ClientSuccess(BatchResultId("someResultId"))
    }

    def validatingGetBatchResult(req: DownloadResultsRequest) = {
      req.jobId shouldBe JobId("someJobId")
      req.batchId shouldBe BatchId("someBatchId")
      req.batchResultId shouldBe BatchResultId("someResultId")

      ClientSuccess(FileContent("someFileContent"))
    }

    val wiredDownloadBatch = DownloadBatchHandler.download(
      validatingUploadFile,
      validatingGetBatchResultId,
      validatingGetBatchResult,
    ) _

    wiredDownloadBatch(
      JobName("someJobName"),
      JobId("someJobId"),
      BatchId("someBatchId"),
      testBasePath,
    ) shouldBe Success(())
  }

  val wireBatch1 = WireBatchInfo(batchId = "batch1", state = "Completed")
  val wireBatch2 = WireBatchInfo(batchId = "batch2", state = "Completed")

  val twoBatchWirestate = WireState(
    jobName = "someJobName",
    objectName = "someObjectName",
    jobId = "someJobId",
    uploadToDataLake = false,
    batches = List(wireBatch1, wireBatch2),
  )

  val twoBatchJson =
    """{
      |"jobName" : "someJobName",
      |"objectName" : "someObjectName",
      |"jobId" : "someJobId",
      |"uploadToDataLake" : false,
      |"batches" : [{
      | "batchId" : "batch1",
      | "state" : "Completed"
      | },{
      | "batchId" : "batch2",
      | "state" : "Completed"
      | }
      | ],
      | "done" : false
      |}
    """.stripMargin
  "WireState" should "convert from WireState to State correctly " in {
    WireState.toState(twoBatchWirestate) shouldBe Success(twoBatchState)

  }
  it should "convert from State to WireState correctly" in {
    WireState.fromState(twoBatchState) shouldBe twoBatchWirestate
  }
  it should "deserialise correctly" in {

    Json.parse(twoBatchJson).as[WireState] shouldBe twoBatchWirestate
  }

  it should "serialise correctly" in {
    Json.toJson(twoBatchWirestate) shouldBe Json.parse(twoBatchJson)
  }
}
