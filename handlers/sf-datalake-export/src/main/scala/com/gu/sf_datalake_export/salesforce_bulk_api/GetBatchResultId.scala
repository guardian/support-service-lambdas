package com.gu.sf_datalake_export.salesforce_bulk_api

import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.sf_datalake_export.salesforce_bulk_api.GetJobBatches.BatchId
import com.gu.util.resthttp.HttpOp.HttpOpWrapper
import com.gu.util.resthttp.JsonHttp.{GetMethod, StringHttpRequest}
import com.gu.util.resthttp.RestRequestMaker.{BodyAsString, RelativePath, UrlParams}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}

import scala.xml.Elem

object GetBatchResultId {

  case class GetBatchResultRequest(jobId: JobId, batchId: BatchId)

  case class BatchResultId(id: String) extends AnyVal

  def toRequest(request: GetBatchResultRequest): StringHttpRequest = {
    val jobIdString = request.jobId.value
    val batchIdString = request.batchId.value
    val relativePath = RelativePath(s"/services/async/44.0/job/$jobIdString/batch/$batchIdString/result")
    StringHttpRequest(GetMethod, relativePath, UrlParams.empty)
  }

  def toResponse(response: BodyAsString): ClientFailableOp[BatchResultId] = {
    val xml: Elem = scala.xml.XML.loadString(response.value)
    (xml \ "result").text match {
      case "" => GenericError("no result id found in response")
      case resultId => ClientSuccess(BatchResultId(resultId))
    }
  }

  val wrapper =
    HttpOpWrapper[GetBatchResultRequest, StringHttpRequest, BodyAsString, BatchResultId](toRequest, toResponse)

}
