package com.com.gu.sf_datalake_export.salesforce_bulk_api

import com.gu.sf_datalake_export.salesforce_bulk_api.BulkApiParams.{BatchSize, SfObjectName}
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.{CreateJobRequest, JobId, WireResponse}
import com.gu.util.resthttp.RestRequestMaker.{Header, PostRequest, RelativePath}
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.{JsObject, JsString}

class CreateJobTest extends FlatSpec with Matchers {

  it should "create a request ok" in {
    val createJobRequest = CreateJobRequest(
      objectType = SfObjectName("Contact"),
      maybeChunkSize = Some(BatchSize(250000))
    )
    val actual = CreateJob.toRequest(createJobRequest)

    val expectedBody = JsObject(List(
      "operation" -> JsString("query"),
      "concurrencyMode" -> JsString("Parallel"),
      "contentType" -> JsString("CSV"),
      "object" -> JsString("Contact")
    ))
    val expected = new PostRequest(expectedBody, RelativePath("/services/async/44.0/job"), List(Header("Sforce-Enable-PKChunking", "chunkSize=250000")))
    actual should be(expected)
  }

  it should "create response" in {
    CreateJob.toResponse(WireResponse("jobID")) shouldBe JobId("jobID")
  }
}
