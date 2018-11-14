package com.com.gu.sf_datalake_export.salesforce_bulk_api

import com.gu.sf_datalake_export.salesforce_bulk_api.CloseJob
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.util.resthttp.RestRequestMaker.{PostRequest, RelativePath}
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.{JsObject, JsString}

class CloseJobTest extends FlatSpec with Matchers {

  it should "create a request ok" in {

    val actual = CloseJob.toRequest(JobId("someJobId"))

    val expectedBody = JsObject(List(
      "state" -> JsString("Closed"),

    ))
    val expected = new PostRequest(expectedBody, RelativePath("/services/async/44.0/job/someJobId"), List.empty)
    actual should be(expected)
  }


}
