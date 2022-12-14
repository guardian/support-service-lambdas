package com.gu.sf_datalake_export.salesforce_bulk_api

import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResultId.BatchResultId
import com.gu.sf_datalake_export.salesforce_bulk_api.GetJobBatches.BatchId
import com.gu.sf_datalake_export.salesforce_bulk_api.S3UploadFile.FileContent
import com.gu.util.resthttp.HttpOp.HttpOpWrapper
import com.gu.util.resthttp.JsonHttp.{GetMethod, StringHttpRequest}
import com.gu.util.resthttp.RestRequestMaker.{BodyAsString, RelativePath, UrlParams}
import com.gu.util.resthttp.Types.ClientSuccess

object GetBatchResult {

  case class JobName(value: String) extends AnyVal

  case class DownloadResultsRequest(
      jobId: JobId,
      batchId: BatchId,
      batchResultId: BatchResultId,
  )

  def toRequest(request: DownloadResultsRequest): StringHttpRequest = {
    val jobIdString = request.jobId.value
    val batchIdString = request.batchId.value
    val resultIdString = request.batchResultId.id
    val relativePath = RelativePath(
      s"/services/async/44.0/job/$jobIdString/batch/$batchIdString/result/$resultIdString",
    )
    StringHttpRequest(GetMethod, relativePath, UrlParams.empty)
  }

  def toResponse(bodyAsString: BodyAsString) = ClientSuccess(FileContent(bodyAsString.value))

  val wrapper =
    HttpOpWrapper[DownloadResultsRequest, StringHttpRequest, BodyAsString, FileContent](toRequest, toResponse)

}
