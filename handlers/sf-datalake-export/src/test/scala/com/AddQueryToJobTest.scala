package com

import com.gu.sf_datalake_export.salesforce_bulk_api.AddQueryToJob.{AddQueryRequest, Query}
import com.gu.sf_datalake_export.salesforce_bulk_api.{AddQueryToJob, CreateJob}
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.{CreateJobRequest, JobId, WireResponse}
import com.gu.util.resthttp.JsonHttp.{PostMethod, StringHttpRequest}
import com.gu.util.resthttp.RestRequestMaker._
import org.scalatest.{FlatSpec, Matchers}

class AddQueryToJobTest extends FlatSpec with Matchers {

  it should "create a request ok" in {
    val addQueryRequest = AddQueryRequest(
      query = Query("Select something from somewhere"),
      jobId = JobId("someId")
    )
    val actual = AddQueryToJob.toRequest(addQueryRequest)

    val expectedBody = BodyAsString("Select something from somewhere")

    val expectedMethod = PostMethod(
      body = BodyAsString("Select something from somewhere"),
      contentType = ContentType("text/csv")
    )
    val expected = new StringHttpRequest(
      requestMethod = expectedMethod,
      relativePath = RelativePath("/services/async/44.0/job/someId/batch"),
      urlParams = UrlParams.empty,

    )

    actual should be(expected)
  }
  
}
