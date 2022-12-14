package com.gu.sf_datalake_export.salesforce_bulk_api

import com.gu.sf_datalake_export.salesforce_bulk_api.BulkApiParams.Soql
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.util.resthttp.HttpOp.HttpOpWrapper
import com.gu.util.resthttp.JsonHttp.{PostMethod, StringHttpRequest}
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}

object AddQueryToJob {

  case class AddQueryRequest(
      query: Soql,
      jobId: JobId,
  )

  def toRequest(addQueryRequest: AddQueryRequest): StringHttpRequest = {
    val jobIdStr = addQueryRequest.jobId.value
    val queryStr = addQueryRequest.query.value

    val relativePath = RelativePath(s"/services/async/44.0/job/$jobIdStr/batch")
    val postMethod = PostMethod(BodyAsString(queryStr), ContentType("text/csv"))

    StringHttpRequest(postMethod, relativePath, UrlParams.empty)
  }

  def toResponse(postResponse: BodyAsString): ClientFailableOp[Unit] = ClientSuccess(())

  val wrapper = HttpOpWrapper[AddQueryRequest, StringHttpRequest, BodyAsString, Unit](toRequest, toResponse)

}
