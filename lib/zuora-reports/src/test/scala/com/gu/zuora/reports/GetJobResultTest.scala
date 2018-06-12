package com.gu.zuora.reports

import com.gu.util.zuora.RestRequestMaker.GenericError
import com.gu.zuora.reports.aqua.AquaJobResponse
import com.gu.zuora.reports.dataModel.Batch
import org.scalatest.AsyncFlatSpec
import org.scalatest.Matchers._
import scalaz.{-\/, \/-}

class GetJobResultTest extends AsyncFlatSpec {

  def ZuoraResponseWithStatus(status: String) = \/-(AquaJobResponse(
    id = None,
    status = status,
    name = "testResponse",
    batches = List(
      aqua.Batch(
        status = "completed",
        name = "batch1",
        fileId = Some("fileId1")
      ),
      aqua.Batch(
        status = "completed",
        name = "batch2",
        fileId = Some("fileId2")
      )
    )
  ))

  it should "return pending if zuora response status is pending " in {
    GetJobResult.toJobResultResponse(ZuoraResponseWithStatus("pending")) shouldBe \/-(Pending("testResponse"))
  }
  it should "return pending if zuora response status is executing " in {
    GetJobResult.toJobResultResponse(ZuoraResponseWithStatus("executing")) shouldBe \/-(Pending("testResponse"))
  }
  it should "return error if zuora response status is an unexpected value " in {
    GetJobResult.toJobResultResponse(ZuoraResponseWithStatus("aborted")) shouldBe -\/(GenericError("unexpected status in zuora response: AquaJobResponse(aborted,testResponse,List(Batch(completed,batch1,Some(fileId1)), Batch(completed,batch2,Some(fileId2))),None)"))
  }

  it should "return completed if zuora response status is completed " in {
    val expected = Completed(
      name = "testResponse",
      batches = List(
        Batch("fileId1", "batch1"),
        Batch("fileId2", "batch2")
      )
    )
    GetJobResult.toJobResultResponse(ZuoraResponseWithStatus("completed")) shouldBe \/-(expected)
  }
  it should "return error if zuora response status is completed but the response is missing fileIds" in {

    val responseWithMissingFileId = \/-(AquaJobResponse(
      id = None,
      status = "completed",
      name = "testResponse",
      batches = List(
        aqua.Batch(
          status = "completed",
          name = "batch1",
          fileId = Some("fileId1")
        ),
        aqua.Batch(
          status = "completed",
          name = "batch2",
          fileId = None
        )
      )
    ))

    GetJobResult.toJobResultResponse(responseWithMissingFileId) shouldBe -\/(GenericError("file Id missing from response : \\/-(AquaJobResponse(completed,testResponse,List(Batch(completed,batch1,Some(fileId1)), Batch(completed,batch2,None)),None))"))
  }
}
