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
  it should "decrease the amount of tries left on each execution" in {
    def get(path: String) = ZuoraResponseWithStatus("pending")
    val jobResultRequest = JobResultRequest(jobId = "someJobId", dryRun = false, tries = Some(7))
    GetJobResult(get)(jobResultRequest) shouldBe \/-(Pending("testResponse", "someJobId", false, 6))
  }

  it should "return error if called with 0 tries left" in {
    def get(path: String) = ZuoraResponseWithStatus("pending")
    val jobResultRequest = JobResultRequest(jobId = "someJobId", dryRun = false, tries = Some(0))
    GetJobResult(get)(jobResultRequest) shouldBe -\/(GenericError("tries must be > 0"))
  }

  it should "return pending if zuora response status is pending " in {
    def get(path: String) = ZuoraResponseWithStatus("pending")
    val jobResultRequest = JobResultRequest("someJobId", false, None)
    GetJobResult(get)(jobResultRequest) shouldBe \/-(Pending("testResponse", "someJobId", false, 9))
  }
  it should "return pending if zuora response status is executing " in {
    def get(path: String) = ZuoraResponseWithStatus("executing")
    val jobResultRequest = JobResultRequest("someJobId", true, None)
    GetJobResult(get)(jobResultRequest) shouldBe \/-(Pending("testResponse", "someJobId", true, 9))
  }
  it should "return error if zuora response status is an unexpected value " in {
    def get(path: String) = ZuoraResponseWithStatus("aborted")
    val jobResultRequest = JobResultRequest("someJobId", false, None)
    val actualResponse = GetJobResult(get)(jobResultRequest)
    actualResponse.leftMap(_.message.split(":")(0)) shouldBe -\/("unexpected status in zuora response")
  }

  it should "return completed if zuora response status is completed " in {
    val expected = Completed(
      name = "testResponse",
      jobId = "someJobId",
      batches = List(
        Batch("fileId1", "batch1"),
        Batch("fileId2", "batch2")
      ),
      false,
      9
    )

    def get(path: String) = ZuoraResponseWithStatus("completed")
    val jobResultRequest = JobResultRequest("someJobId", false, None)

    GetJobResult(get)(jobResultRequest) shouldBe \/-(expected)
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

    def get(path: String) = responseWithMissingFileId
    val jobResultRequest = JobResultRequest("someJobId", false, None)

    GetJobResult(get)(jobResultRequest) shouldBe -\/(GenericError("file Id missing from response : \\/-(AquaJobResponse(completed,testResponse,List(Batch(completed,batch1,Some(fileId1)), Batch(completed,batch2,None)),None))"))
  }
}
