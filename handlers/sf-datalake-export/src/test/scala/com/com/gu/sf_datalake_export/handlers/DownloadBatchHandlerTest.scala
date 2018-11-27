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
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json

import scala.util.{Success, Try}

class DownloadBatchHandlerTest extends FlatSpec with Matchers {

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
    IsDone(false)

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
      validatingGetBatchResult
    ) _

    wiredDownloadBatch(JobName("someJobName"), JobId("someJobId"), BatchId("someBatchId"), testBasePath) shouldBe Success(())
  }

  "uploadBasePath" should "return ophan bucket basepath for PROD requests with uploadToDataLake enabled" in {
    val contactName = BulkApiParams.contact.objectName
    val actualBasePath = DownloadBatchHandler.uploadBasePath(Stage("PROD"))(contactName, ShouldUploadToDataLake(true))
    actualBasePath shouldBe S3Path(BucketName("ophan-raw-salesforce-customer-data-contact"), None)
  }

  it should "return test bucket basepath for PROD requests with uploadToDataLake disabled" in {
    val contactName = BulkApiParams.contact.objectName
    val actualBasePath = DownloadBatchHandler.uploadBasePath(Stage("PROD"))(contactName, ShouldUploadToDataLake(false))
    actualBasePath shouldBe S3Path(BucketName("gu-salesforce-export-prod"), None)
  }

  it should "return test bucket basepath for non PROD requests regardless of the uploadToDataLake param" in {
    val contactName = BulkApiParams.contact.objectName
    val codeBasePath = DownloadBatchHandler.uploadBasePath(Stage("CODE"))(contactName, ShouldUploadToDataLake(false))
    val codeBasePathUploadToDl = DownloadBatchHandler.uploadBasePath(Stage("CODE"))(contactName, ShouldUploadToDataLake(false))
    List(codeBasePath, codeBasePathUploadToDl).distinct shouldBe List(S3Path(BucketName("gu-salesforce-export-code"), None))
  }

  val wireBatch1 = WireBatchInfo(batchId = "batch1", state = "Completed")
  val wireBatch2 = WireBatchInfo(batchId = "batch2", state = "Completed")

  val twoBatchWirestate = WireState(
    jobName = "someJobName",
    objectName = "someObjectName",
    jobId = "someJobId",
    uploadToDataLake = false,
    batches = List(wireBatch1, wireBatch2)
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

