package com.com.gu.sf_datalake_export.salesforce_bulk_api

import com.gu.sf_datalake_export.salesforce_bulk_api.CloseJob
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.util.resthttp.RestRequestMaker.{PostRequest, RelativePath}
import play.api.libs.json.{JsObject, JsString}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class CloseJobTest extends AnyFlatSpec with Matchers {

  it should "create a request ok" in {

    val actual = CloseJob.toRequest(JobId("someJobId"))

    val expectedBody = JsObject(
      List(
        "state" -> JsString("Closed"),
      ),
    )
    val expected = new PostRequest(expectedBody, RelativePath("/services/async/44.0/job/someJobId"))
    actual should be(expected)
  }

}
