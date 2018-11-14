package com.com.gu.sf_datalake_export.salesforce_bulk_api

import com.gu.sf_datalake_export.GetBatches
import com.gu.sf_datalake_export.GetBatches.{CompletedJob, FailedJob, PendingJob}
import com.gu.sf_datalake_export.salesforce_bulk_api.GetJobBatches._
import org.scalatest.{FlatSpec, Matchers}

class GetBatchesTest extends FlatSpec with Matchers {
  "getJobStatus" should "set job as failed if there is at least on failed batch" in {
    val batches = Seq(
      BatchInfo(BatchId("1"), Completed),
      BatchInfo(BatchId("2"), Failed),
      BatchInfo(BatchId("3"), InProgress)
    )
    GetBatches.getJobStatus(batches) shouldBe FailedJob
  }

  it should "set job as pending if there are no failures and there is at least one batch in progress" in {
    val batches = Seq(
      BatchInfo(BatchId("1"), Completed),
      BatchInfo(BatchId("2"), InProgress),
      BatchInfo(BatchId("3"), Completed)
    )
    GetBatches.getJobStatus(batches) shouldBe PendingJob
  }

  it should "set job as pending if there are no failures and there is at least one queued batch" in {
    val batches = Seq(
      BatchInfo(BatchId("1"), Completed),
      BatchInfo(BatchId("2"), Queued),
      BatchInfo(BatchId("3"), NotProcessed)
    )
    GetBatches.getJobStatus(batches) shouldBe PendingJob
  }

  it should "set job as completed if all batches are completed " in {
    val batches = Seq(
      BatchInfo(BatchId("1"), Completed),
      BatchInfo(BatchId("2"), Completed),
      BatchInfo(BatchId("3"), Completed)
    )
    GetBatches.getJobStatus(batches) shouldBe CompletedJob
  }

  it should "set job as completed if all batches are not processed " in {
    val batches = Seq(
      BatchInfo(BatchId("1"), NotProcessed),
      BatchInfo(BatchId("2"), NotProcessed),
      BatchInfo(BatchId("3"), NotProcessed)
    )
    GetBatches.getJobStatus(batches) shouldBe CompletedJob
  }

  it should "set job as completed if all batches are either completed or not processed " in {
    val batches = Seq(
      BatchInfo(BatchId("1"), NotProcessed),
      BatchInfo(BatchId("2"), Completed),
      BatchInfo(BatchId("3"), NotProcessed)
    )
    GetBatches.getJobStatus(batches) shouldBe CompletedJob
  }

  it should "set job as completed if there are no batches " in {
    GetBatches.getJobStatus(Seq.empty) shouldBe CompletedJob
  }
}
