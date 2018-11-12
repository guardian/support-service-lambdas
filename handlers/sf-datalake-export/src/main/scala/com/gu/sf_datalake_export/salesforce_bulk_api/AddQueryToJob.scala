package com.gu.sf_datalake_export.salesforce_bulk_api

import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.util.resthttp.HttpOp
import com.gu.util.resthttp.JsonHttp.{PostMethod, StringHttpRequest}
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.ClientFailableOp

object AddQueryToJob {

  case class AddQueryRequest(
    query: Query,
    jobId: JobId,
  )

  case class Query(value: String) extends AnyVal

  def toRequest(addQueryRequest: AddQueryRequest) = {
    val jobIdStr = addQueryRequest.jobId.value
    val queryStr = addQueryRequest.query.value

    val relativePath = RelativePath(s"/services/async/44.0/job/$jobIdStr/batch")
    val postMethod = PostMethod(BodyAsString(queryStr), ContentType("text/csv"))

    StringHttpRequest(postMethod, relativePath, UrlParams.empty)
  }


  def apply(post: HttpOp[StringHttpRequest, BodyAsString]): AddQueryRequest => ClientFailableOp[Unit] =
    post.setupRequest[AddQueryRequest](toRequest).map(_ => ()).runRequest

}
