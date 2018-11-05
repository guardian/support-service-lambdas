package com.gu.sf_datalake_export.salesforce_bulk_api

import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.sf_datalake_export.salesforce_bulk_api.GetJobBatches.BatchId
import com.gu.util.resthttp.HttpOp
import com.gu.util.resthttp.JsonHttp.{GetMethod, StringHttpRequest}
import com.gu.util.resthttp.RestRequestMaker.{BodyAsString, RelativePath, UrlParams}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}

import scala.xml.Elem

object GetBatchResultId {

  case class GetBatchResultRequest(jobId: JobId, batchId: BatchId)

  case class BatchResultId(id: String) extends AnyVal

  def apply(post: HttpOp[StringHttpRequest, BodyAsString]): GetBatchResultRequest => ClientFailableOp[BatchResultId] =
    post.setupRequest[GetBatchResultRequest] { request: GetBatchResultRequest =>
      val jobIdString = request.jobId.value
      val batchIdString = request.batchId.value
      val relativePath = RelativePath(s"/services/async/44.0/job/$jobIdString/batch/$batchIdString/result")
      StringHttpRequest(GetMethod, relativePath, UrlParams.empty)
    }.flatMap { response =>

      println(response.value)
      val xml: Elem = scala.xml.XML.loadString(response.value)
      val resultId = (xml \ "result").text
      //todo do this in a better way
      if (resultId.isEmpty)
        GenericError("no result id found in response")
      else
        ClientSuccess(BatchResultId(resultId))

    }.runRequest

}
