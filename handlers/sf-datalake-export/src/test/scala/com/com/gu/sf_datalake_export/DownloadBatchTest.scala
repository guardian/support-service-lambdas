package com.com.gu.sf_datalake_export

import com.gu.sf_datalake_export.DownloadBatches
import com.gu.sf_datalake_export.DownloadBatches.{WireBatch, WireState}
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResult.{DownloadResultsRequest, JobName}
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResultId.{BatchResultId, GetBatchResultRequest}
import com.gu.sf_datalake_export.salesforce_bulk_api.GetJobBatches.BatchId
import com.gu.sf_datalake_export.salesforce_bulk_api.S3UploadFile.{File, FileContent, FileName}
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.{FlatSpec, Matchers}

import scala.util.{Success, Try}

class DownloadBatchTest extends FlatSpec with Matchers {

  def fakeDownloadBatch(jobName: JobName, jobId: JobId, batchId: BatchId): Try[Unit] = {
    jobName.value shouldBe "someJobName"
    jobId.value shouldBe "someJobId"
    batchId.value shouldBe "batch1"
    Success(())
  }

  val wireBatch1 = WireBatch(batchId = "batch1", state = "Completed")
  val wireBatch2 = WireBatch(batchId = "batch2", state = "Completed")

  val twoBatchState = WireState(
    jobName = "someJobName",
    jobId = "someJobId",
    batches = List(wireBatch1, wireBatch2)
  )

  "DownloadBatches.steps" should "download first batch in request and remove it from response " in {
    val requestWithoutBatch1 = twoBatchState.copy(batches = List(wireBatch2))
    DownloadBatches.steps(fakeDownloadBatch)(twoBatchState) shouldBe Success(requestWithoutBatch1)
  }

  it should "set done to true if downloading last batch" in {
    val oneBatchState = twoBatchState.copy(batches = List(wireBatch1))
    val doneResponse = oneBatchState.copy(batches = List.empty, done = true)

    DownloadBatches.steps(fakeDownloadBatch)(oneBatchState) shouldBe Success(doneResponse)
  }

  it should "set done to true if there are no batches to download" in {
    val noBatchState = twoBatchState.copy(batches = List.empty)
    val doneResponse = noBatchState.copy(done = true)

    DownloadBatches.steps(fakeDownloadBatch)(noBatchState) shouldBe Success(doneResponse)
  }


  "DownloadBatches.downloadBatch" should "download file contents and upload to s3 " in {
    def validatingUploadFile(file: File): Try[Unit] = {
      file.fileName shouldBe FileName("someJobName-someJobId-someResultId.csv")
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

    val wiredDownloadBatch = DownloadBatches.downloadBatch(validatingUploadFile, validatingGetBatchResultId, validatingGetBatchResult) _

    wiredDownloadBatch(JobName("someJobName"), JobId("someJobId"), BatchId("someBatchId")) shouldBe Success(())
  }
}
