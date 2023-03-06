package com.gu.zuora.reports

import com.gu.util.resthttp.RestRequestMaker.RequestsGet
import com.gu.util.resthttp.Types.{ClientSuccess, GenericError}
import com.gu.zuora.reports.aqua.AquaJobResponse
import com.gu.zuora.reports.dataModel.Batch
import org.scalatest.matchers.should.Matchers._
import org.scalatest.matchers
import org.scalatest.flatspec.AsyncFlatSpec

class GetJobResultTest extends AsyncFlatSpec {

  def ZuoraResponseWithStatus(status: String) = ClientSuccess(
    AquaJobResponse(
      id = None,
      status = status,
      name = "testResponse",
      batches = List(
        aqua.Batch(
          status = "completed",
          name = "batch1",
          fileId = Some("fileId1"),
        ),
        aqua.Batch(
          status = "completed",
          name = "batch2",
          fileId = Some("fileId2"),
        ),
      ),
    ),
  )

  it should "decrease the amount of tries left on each execution" in {
    def get: RequestsGet[AquaJobResponse] = { case notTested => ZuoraResponseWithStatus("pending") }
    val jobResultRequest = JobResultRequest(jobId = "someJobId", dryRun = false, tries = Some(7))
    GetJobResult(get)(jobResultRequest) shouldBe ClientSuccess(Pending("testResponse", "someJobId", false, 6))
  }

  it should "return error if called with 0 tries left" in {
    def get: RequestsGet[AquaJobResponse] = { case notTested => ZuoraResponseWithStatus("pending") }
    val jobResultRequest = JobResultRequest(jobId = "someJobId", dryRun = false, tries = Some(0))
    GetJobResult(get)(jobResultRequest) shouldBe GenericError("tries must be > 0")
  }

  it should "return pending if zuora response status is pending " in {
    def get: RequestsGet[AquaJobResponse] = { case notTested => ZuoraResponseWithStatus("pending") }
    val jobResultRequest = JobResultRequest("someJobId", false, None)
    GetJobResult(get)(jobResultRequest) shouldBe ClientSuccess(Pending("testResponse", "someJobId", false, 9))
  }
  it should "return pending if zuora response status is executing " in {
    def get: RequestsGet[AquaJobResponse] = { case notTested => ZuoraResponseWithStatus("executing") }
    val jobResultRequest = JobResultRequest("someJobId", true, None)
    GetJobResult(get)(jobResultRequest) shouldBe ClientSuccess(Pending("testResponse", "someJobId", true, 9))
  }
  it should "return error if zuora response status is an unexpected value " in {
    def get: RequestsGet[AquaJobResponse] = { case notTested => ZuoraResponseWithStatus("aborted") }
    val jobResultRequest = JobResultRequest("someJobId", false, None)
    val actualResponse = GetJobResult(get)(jobResultRequest).toDisjunction
    actualResponse.left.map(_.message.split(":")(0)) shouldBe Left("unexpected status in zuora response")
  }

  it should "return completed if zuora response status is completed " in {
    val expected = Completed(
      name = "testResponse",
      jobId = "someJobId",
      batches = List(
        Batch("fileId1", "batch1"),
        Batch("fileId2", "batch2"),
      ),
      false,
      9,
    )

    def get: RequestsGet[AquaJobResponse] = { case notTested => ZuoraResponseWithStatus("completed") }
    val jobResultRequest = JobResultRequest("someJobId", false, None)

    GetJobResult(get)(jobResultRequest) shouldBe ClientSuccess(expected)
  }
  it should "return error if zuora response status is completed but the response is missing fileIds" in {

    val responseWithMissingFileId = ClientSuccess(
      AquaJobResponse(
        id = None,
        status = "completed",
        name = "testResponse",
        batches = List(
          aqua.Batch(
            status = "completed",
            name = "batch1",
            fileId = Some("fileId1"),
          ),
          aqua.Batch(
            status = "completed",
            name = "batch2",
            fileId = None,
          ),
        ),
      ),
    )

    def get: RequestsGet[AquaJobResponse] = { case notTested => responseWithMissingFileId }
    val jobResultRequest = JobResultRequest("someJobId", false, None)

    // test is too specific, shoudlnt' check so much detail
    GetJobResult(get)(jobResultRequest) shouldBe GenericError(
      "file Id missing from response : ClientSuccess(AquaJobResponse(completed,testResponse,List(Batch(completed,batch1,Some(fileId1)), Batch(completed,batch2,None)),None))",
    )
  }
}
