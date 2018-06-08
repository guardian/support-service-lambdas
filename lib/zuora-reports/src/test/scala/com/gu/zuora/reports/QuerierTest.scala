package com.gu.zuora.reports

import com.gu.util.zuora.RestRequestMaker.GenericError
import com.gu.zuora.reports.aqua.AquaJobResponse
import org.scalatest.AsyncFlatSpec
import org.scalatest.Matchers._
import scalaz.{-\/, \/-}

class QuerierTest extends AsyncFlatSpec {

  it should "return error if no job id in response " in {
    val noJobIdResponse = \/-(AquaJobResponse(
      id = None,
      status = "submitted",
      name = "someName",
      batches = Seq()
    ))

    Querier.toQuerierResponse(noJobIdResponse) shouldBe -\/(GenericError("unexpected response from zuora: AquaJobResponse(submitted,someName,List(),None)"))
  }

  it should "return jobId if response from Zuora is successful " in {
    val noJobIdResponse = \/-(AquaJobResponse(
      id = Some("jobId"),
      status = "submitted",
      name = "someName",
      batches = Seq()
    ))

    Querier.toQuerierResponse(noJobIdResponse) shouldBe \/-(QuerierResponse("someName", "jobId"))
  }
}
