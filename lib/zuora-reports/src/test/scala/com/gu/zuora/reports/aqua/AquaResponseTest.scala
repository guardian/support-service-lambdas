package com.gu.zuora.reports.aqua

import org.scalatest.matchers.should.Matchers._
import org.scalatest._
import play.api.libs.json.Json
import org.scalatest.matchers
import org.scalatest.flatspec.AsyncFlatSpec

class AquaResponseTest extends AsyncFlatSpec {

  it should "deserialise successful query response " in {
    val successResponse = Json.parse(
      """{
      |    "encrypted": "none",
      |    "useLastCompletedJobQueries": false,
      |    "batches": [
      |        {
      |            "localizedStatus": "pending",
      |            "recordCount": 0,
      |            "batchId": "1234567891234e678s83274f37487384",
      |            "apiVersion": "91.0",
      |            "batchType": "zoqlexport",
      |            "full": true,
      |            "status": "pending",
      |            "name": "job1",
      |            "query": "SELECT Id FROM Subscription WHERE  id='123'"
      |        },
      |        {
      |            "localizedStatus": "pending",
      |            "recordCount": 0,
      |            "batchId": "1234531d91234e678123274f37487384",
      |            "apiVersion": "91.0",
      |            "batchType": "zoqlexport",
      |            "full": true,
      |            "status": "pending",
      |            "name": "job2",
      |            "query": "SELECT Id FROM Subscription WHERE  id='444'"
      |        }
      |    ],
      |    "status": "submitted",
      |    "name": "testJob",
      |    "id": "1adsad12983729873298173982173982",
      |    "version": "1.0",
      |    "format": "CSV"
      |}""".stripMargin,
    )

    val expected = AquaJobResponse(
      status = "submitted",
      name = "testJob",
      batches = Seq(
        Batch("pending", "job1"),
        Batch("pending", "job2"),
      ),
      id = Some("1adsad12983729873298173982173982"),
    )

    val actual = successResponse.as[AquaJobResponse]
    actual shouldBe expected
  }

}
