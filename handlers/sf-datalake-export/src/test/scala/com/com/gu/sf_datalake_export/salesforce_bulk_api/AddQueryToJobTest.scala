package com.com.gu.sf_datalake_export.salesforce_bulk_api

import com.gu.sf_datalake_export.salesforce_bulk_api.AddQueryToJob
import com.gu.sf_datalake_export.salesforce_bulk_api.AddQueryToJob.AddQueryRequest
import com.gu.sf_datalake_export.salesforce_bulk_api.BulkApiParams.Soql
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.util.resthttp.JsonHttp.{PostMethod, StringHttpRequest}
import com.gu.util.resthttp.RestRequestMaker._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class AddQueryToJobTest extends AnyFlatSpec with Matchers {

  it should "create a request ok" in {
    val addQueryRequest = AddQueryRequest(
      query = Soql("Select something from somewhere"),
      jobId = JobId("someId"),
    )

    val expectedMethod = PostMethod(
      body = BodyAsString("Select something from somewhere"),
      contentType = ContentType("text/csv"),
    )

    val expected = new StringHttpRequest(
      requestMethod = expectedMethod,
      relativePath = RelativePath("/services/async/44.0/job/someId/batch"),
      urlParams = UrlParams.empty,
    )

    val actual = AddQueryToJob.toRequest(addQueryRequest)

    actual should be(expected)
  }

}
