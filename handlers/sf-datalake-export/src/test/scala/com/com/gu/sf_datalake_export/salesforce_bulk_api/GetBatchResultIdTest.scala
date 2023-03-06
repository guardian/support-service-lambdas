package com.com.gu.sf_datalake_export.salesforce_bulk_api

import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResultId
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResultId.{BatchResultId, GetBatchResultRequest}
import com.gu.sf_datalake_export.salesforce_bulk_api.GetJobBatches.BatchId
import com.gu.util.resthttp.JsonHttp.{GetMethod, StringHttpRequest}
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetBatchResultIdTest extends AnyFlatSpec with Matchers {

  it should "create a request ok" in {

    val request = GetBatchResultRequest(JobId("someJobId"), BatchId("someBatchId"))
    val actual = GetBatchResultId.toRequest(request)
    val expected = new StringHttpRequest(
      requestMethod = GetMethod,
      relativePath = RelativePath("/services/async/44.0/job/someJobId/batch/someBatchId/result"),
      urlParams = UrlParams.empty,
    )

    actual should be(expected)
  }

  it should "create response" in {
    val sfResponse =
      """<?xml version="1.0" encoding="UTF-8"?>
        |<result-list xmlns="http://www.force.com/2009/06/asyncapi/dataload">
        |  <result>someResultId</result>
        |</result-list>
        |
      """.stripMargin

    GetBatchResultId.toResponse(BodyAsString(sfResponse)) shouldBe ClientSuccess(BatchResultId("someResultId"))
  }
}
