package com.gu.zuora.reports

import com.gu.util.resthttp.Types.{ClientSuccess, GenericError}
import com.gu.zuora.reports.aqua.AquaJobResponse
import org.scalatest.matchers.should.Matchers._
import org.scalatest.matchers
import org.scalatest.flatspec.AsyncFlatSpec

class QuerierTest extends AsyncFlatSpec {

  it should "return error if no job id in response " in {
    val noJobIdResponse = ClientSuccess(
      AquaJobResponse(
        id = None,
        status = "submitted",
        name = "someName",
        batches = Seq(),
      ),
    )

    Querier.toQuerierResponse(noJobIdResponse, false) shouldBe GenericError(
      "unexpected response from zuora: AquaJobResponse(submitted,someName,List(),None)",
    )
  }

  it should "return jobId if response from Zuora is successful " in {
    val noJobIdResponse = ClientSuccess(
      AquaJobResponse(
        id = Some("jobId"),
        status = "submitted",
        name = "someName",
        batches = Seq(),
      ),
    )

    Querier.toQuerierResponse(noJobIdResponse, false) shouldBe ClientSuccess(
      QuerierResponse("someName", "jobId", false),
    )
  }
}
