package com.gu.zuora.reports

import com.gu.util.zuora.RestRequestMaker.GenericError
import com.gu.zuora.reports.aqua.ZuoraAquaResponse
import org.scalatest.AsyncFlatSpec
import org.scalatest.Matchers._
import scalaz.{-\/, \/-}

class QuerierTest extends AsyncFlatSpec {

  it should "return error if no job id in response " in {
    val noJobIdResponse = \/-(ZuoraAquaResponse(
      id = None,
      status = "submitted",
      name = "someNAme",
      errorCode = None,
      message = None,
      batches = Seq()
    ))

    Querier.toQuerierResponse(noJobIdResponse) shouldBe -\/(GenericError("unexpected response from zuora: ZuoraAquaResponse(submitted,someNAme,None,None,List(),None)"))
  }

  it should "return jobId if response from Zuora is successful " in {
    val noJobIdResponse = \/-(ZuoraAquaResponse(
      id = Some("jobId"),
      status = "submitted",
      name = "someNAme",
      errorCode = None,
      message = None,
      batches = Seq()
    ))

    Querier.toQuerierResponse(noJobIdResponse) shouldBe \/-(QuerierResponse("jobId"))
  }
}
