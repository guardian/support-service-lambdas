package com.gu.zuora.reports

import play.api.libs.json.Json
import org.scalatest.matchers.should.Matchers._
import JobResult.writes
import com.gu.zuora.reports.dataModel.Batch
import org.scalatest.matchers
import org.scalatest.flatspec.AsyncFlatSpec
class GetJobResultResponseTest extends AsyncFlatSpec {
  it should "deserialize completed response correctly" in {
    val completedResponse = Completed(
      name = "testResponse",
      jobId = "someJobId",
      batches = List(
        Batch("fileId1", "batch1"),
        Batch("fileId2", "batch2"),
      ),
      true,
      13,
    )

    val expected =
      """
        |{
        |  "name": "testResponse",
        |  "jobId" : "someJobId",
        |  "status": "completed",
        |  "batches": [
        |    {
        |      "fileId": "fileId1",
        |      "name": "batch1"
        |    },
        |    {
        |      "fileId": "fileId2",
        |      "name": "batch2"
        |    }
        |  ],
        |  "dryRun": true,
        |  "tries" : 13
        |}
      """.stripMargin

    Json.toJson(completedResponse) shouldBe Json.parse(expected)
  }

  it should "deserialize pending response correctly" in {

    val expected =
      """
        |{
        |  "name": "testResponse",
        |  "jobId" : "someJobId",
        |  "status" : "pending",
        |  "dryRun" : false,
        |  "tries" : 13
        |}
      """.stripMargin

    val pendingResponse = Pending("testResponse", "someJobId", false, 13)

    Json.toJson(pendingResponse) shouldBe Json.parse(expected)
  }
}
