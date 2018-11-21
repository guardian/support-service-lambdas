package com.com.gu.sf_datalake_export.handlers

import com.gu.sf_datalake_export.handlers.DownloadBatchHandler
import com.gu.sf_datalake_export.handlers.DownloadBatchHandler.{WireBatch, WireState}
import com.gu.sf_datalake_export.handlers.StartJobHandler.UploadToDataLake
import com.gu.sf_datalake_export.salesforce_bulk_api.BulkApiParams
import com.gu.sf_datalake_export.salesforce_bulk_api.BulkApiParams.ObjectName
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResult.{DownloadResultsRequest, JobName}
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResultId.{BatchResultId, GetBatchResultRequest}
import com.gu.sf_datalake_export.salesforce_bulk_api.GetJobBatches.BatchId
import com.gu.sf_datalake_export.salesforce_bulk_api.S3UploadFile.{BasePath, File, FileContent, FileName}
import com.gu.util.config.Stage
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.{FlatSpec, Matchers}

import scala.util.{Success, Try}

class DownloadBatchHandlerTest extends FlatSpec with Matchers {

  def fakeDownloadBatch(jobName: JobName, objectName: ObjectName, jobId: JobId, batchId: BatchId): Try[Unit] = {
    jobName.value shouldBe "someJobName"
    jobId.value shouldBe "someJobId"
    batchId.value shouldBe "batch1"
    objectName.value shouldBe "someObjectName"
    Success(())
  }

  val wireBatch1 = WireBatch(batchId = "batch1", state = "Completed")
  val wireBatch2 = WireBatch(batchId = "batch2", state = "Completed")

  val twoBatchState = WireState(
    jobName = "someJobName",
    objectName = "someObjectName",
    jobId = "someJobId",
    uploadToDataLake = false,
    batches = List(wireBatch1, wireBatch2)
  )

  "DownloadBatches.steps" should "download first batch in request and remove it from response " in {
    val requestWithoutBatch1 = twoBatchState.copy(batches = List(wireBatch2))
    DownloadBatchHandler.steps(fakeDownloadBatch)(twoBatchState) shouldBe Success(requestWithoutBatch1)
  }

  it should "set done to true if downloading last batch" in {
    val oneBatchState = twoBatchState.copy(batches = List(wireBatch1))
    val doneResponse = oneBatchState.copy(batches = List.empty, done = true)

    DownloadBatchHandler.steps(fakeDownloadBatch)(oneBatchState) shouldBe Success(doneResponse)
  }

  it should "set done to true if there are no batches to download" in {
    val noBatchState = twoBatchState.copy(batches = List.empty)
    val doneResponse = noBatchState.copy(done = true)

    DownloadBatchHandler.steps(fakeDownloadBatch)(noBatchState) shouldBe Success(doneResponse)
  }

  "DownloadBatches.downloadBatch" should "download file contents and upload to s3 " in {
    def validatingUploadFile(basePath: BasePath, file: File): Try[Unit] = {
      basePath shouldBe BasePath("someBasePath")
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

    def basePathFor(objectName: ObjectName, uploadToDataLake: UploadToDataLake) = {
      uploadToDataLake shouldBe UploadToDataLake(false)
      objectName shouldBe ObjectName("someObjectName")
      BasePath(s"someBasePath")
    }

    val wiredDownloadBatch = DownloadBatchHandler.download(
      UploadToDataLake(false),
      basePathFor,
      validatingUploadFile,
      validatingGetBatchResultId,
      validatingGetBatchResult
    ) _

    wiredDownloadBatch(JobName("someJobName"), ObjectName("someObjectName"), JobId("someJobId"), BatchId("someBatchId")) shouldBe Success(())
  }

  "uploadBasePath" should "return ophan bucket basepath for PROD requests with uploadToDataLake enabled" in {
    val contactName = BulkApiParams.contact.objectName
    val actualBasePath = DownloadBatchHandler.uploadBasePath(Stage("PROD"))(contactName, UploadToDataLake(true))
    actualBasePath shouldBe BasePath("ophan-raw-salesforce-customer-data-contact")
  }

  it should "return test bucket basepath for PROD requests with uploadToDataLake disabled" in {
    val contactName = BulkApiParams.contact.objectName
    val actualBasePath = DownloadBatchHandler.uploadBasePath(Stage("PROD"))(contactName, UploadToDataLake(false))
    actualBasePath shouldBe BasePath("gu-salesforce-export-test/PROD/raw")
  }

  it should "return test bucket basepath for non PROD requests regardless of the uploadToDataLake param" in {
    val contactName = BulkApiParams.contact.objectName
    val codeBasePath = DownloadBatchHandler.uploadBasePath(Stage("CODE"))(contactName, UploadToDataLake(false))
    val codeBasePathUploadToDl = DownloadBatchHandler.uploadBasePath(Stage("CODE"))(contactName, UploadToDataLake(false))
    List(codeBasePath, codeBasePathUploadToDl).distinct shouldBe List(BasePath("gu-salesforce-export-test/CODE/raw"))
  }
}
