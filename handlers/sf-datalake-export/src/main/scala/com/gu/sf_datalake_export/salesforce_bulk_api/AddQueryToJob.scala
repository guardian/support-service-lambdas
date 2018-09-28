package com.gu.sf_datalake_export.salesforce_bulk_api

import com.gu.salesforce.SalesforceClient.{PostMethod, StringHttpRequest}
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{HttpOp}

object AddQueryToJob {

  case class AddQueryRequest(
    query: Query,
    jobId: JobId
  )

  case class Query(value: String) extends AnyVal

  //TODO MAYBE PARSE XML LATER?
  def apply(post: HttpOp[StringHttpRequest, BodyAsString]): AddQueryRequest => ClientFailableOp[Unit] =
    post.setupRequest[AddQueryRequest] { addQueryRequest =>
      val jobIdStr = addQueryRequest.jobId.value
      val queryStr = addQueryRequest.query.value
      //do this the right way, and if there is no right way define plain post requests somewhere
      val relativePath = RelativePath(s"/services/async/44.0/job/$jobIdStr/batch")
      val postMethod = PostMethod(BodyAsString(queryStr), ContentType("text/csv"))
      val contentTypeHeader = Header(name = "content-type", value = "text/csv") // this header seems to be useless
      StringHttpRequest(relativePath, postMethod, headers = List(contentTypeHeader))
    }.map(_ => ()).runRequest

}
