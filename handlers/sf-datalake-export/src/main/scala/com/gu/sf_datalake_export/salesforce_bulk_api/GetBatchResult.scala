package com.gu.sf_datalake_export.salesforce_bulk_api

import com.gu.salesforce.SalesforceClient.{GetMethod, StringHttpRequest}
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResultId.BatchResultId
import com.gu.sf_datalake_export.salesforce_bulk_api.GetJobBatches.BatchId
import com.gu.sf_datalake_export.salesforce_bulk_api.S3UploadFile.FileContent
import com.gu.util.resthttp.HttpOp
import com.gu.util.resthttp.RestRequestMaker.{BodyAsString, RelativePath}
import com.gu.util.resthttp.Types.ClientFailableOp

object GetBatchResult {

  case class JobName(value: String) extends AnyVal

  case class DownloadResultsRequest(
    jobId: JobId,
    batchId: BatchId,
    batchResultId: BatchResultId,
  )

  def apply(
    post: HttpOp[StringHttpRequest, BodyAsString],

  ): DownloadResultsRequest => ClientFailableOp[FileContent] =
    post.setupRequest[DownloadResultsRequest] { request: DownloadResultsRequest =>
      val jobIdString = request.jobId.value
      val batchIdString = request.batchId.value
      val resultIdString = request.batchResultId.id
      val relativePath = RelativePath(s"/services/async/44.0/job/$jobIdString/batch/$batchIdString/result/$resultIdString")
      StringHttpRequest(relativePath, GetMethod)
    }.map(body => FileContent(body.value)).runRequest

}
