package com.com.gu.sf_datalake_export.salesforce_bulk_api

import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResult
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResult.DownloadResultsRequest
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResultId.BatchResultId
import com.gu.sf_datalake_export.salesforce_bulk_api.GetJobBatches.BatchId
import com.gu.sf_datalake_export.salesforce_bulk_api.S3UploadFile.FileContent
import com.gu.util.resthttp.JsonHttp.{GetMethod, StringHttpRequest}
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetBatchResultTest extends AnyFlatSpec with Matchers {

  it should "create a request ok" in {

    val request = DownloadResultsRequest(JobId("someJobId"), BatchId("someBatchId"), BatchResultId("someBatchResultId"))
    val actual = GetBatchResult.toRequest(request)

    val expected = new StringHttpRequest(
      requestMethod = GetMethod,
      relativePath = RelativePath("/services/async/44.0/job/someJobId/batch/someBatchId/result/someBatchResultId"),
      urlParams = UrlParams.empty,
    )

    actual should be(expected)
  }

  it should "create response" in {
    val sfResponse = "some file contents"
    GetBatchResult.toResponse(BodyAsString(sfResponse)) shouldBe ClientSuccess(FileContent("some file contents"))
  }
}
