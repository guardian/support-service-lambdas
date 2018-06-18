package com.gu.zuora.reports

import play.api.libs.json.Json
import org.scalatest.AsyncFlatSpec
import org.scalatest.Matchers._
import JobResult.writes
import com.gu.zuora.reports.dataModel.Batch
class GetJobResultResponseTest extends AsyncFlatSpec {
  it should "deserialize completed response correctly" in {
    val completedResponse = Completed(
      name = "testResponse",
      batches = List(
        Batch("fileId1", "batch1"),
        Batch("fileId2", "batch2")
      )
    )

    val expected =
      """
        |{
        |  "name": "testResponse",
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
        |  ]
        |}
      """.stripMargin

    Json.toJson(completedResponse) shouldBe Json.parse(expected)
  }

  it should "deserialize pending response correctly" in {

    val expected =
      """
        |{
        |  "name": "testResponse",
        |  "status" : "pending"
        |}
      """.stripMargin

    val pendingResponse = Pending("testResponse")

    Json.toJson(pendingResponse) shouldBe Json.parse(expected)
  }
}
