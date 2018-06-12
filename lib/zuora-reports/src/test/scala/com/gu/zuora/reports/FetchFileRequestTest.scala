package com.gu.zuora.reports

import com.gu.zuora.reports.dataModel.{Batch, FetchedFile}
import org.scalatest.Matchers._
import org.scalatest._
import play.api.libs.json.Json

class FetchFileRequestTest extends AsyncFlatSpec {

  val batches = List(
    Batch("candidatesFileId", "candidatesQuery"),
    Batch("exclusionFileId", "exclusionQuery")
  )

  it should "deserialise successfully with no already fetched files in request  " in {
    val fetcFileRequest = Json.parse(
      """{
      |  "name": "zuora-retention",
      |  "status": "completed",
      |  "batches": [
      |    {
      |      "fileId": "candidatesFileId",
      |      "name": "candidatesQuery"
      |    },
      |    {
      |      "fileId": "exclusionFileId",
      |      "name": "exclusionQuery"
      |    }
      |  ]
      |}""".stripMargin
    )

    val actual = fetcFileRequest.as[FetchFileRequest]
    actual shouldBe FetchFileRequest(List.empty, batches)
  }

  it should "deserialise successfully with already fetched files in request  " in {
    val fetcFileRequest = Json.parse(
      """{
        |  "name": "zuora-retention",
        |  "status": "completed",
        |  "batches": [
        |    {
        |      "fileId": "candidatesFileId",
        |      "name": "candidatesQuery"
        |    },
        |    {
        |      "fileId": "exclusionFileId",
        |      "name": "exclusionQuery"
        |    }
        |  ],
        |  "fetched" : [ {
        |   "fileId" : "someOtherFileId",
        |   "name" : "someOtherQuery",
        |  "uri" : "s3://someBucket/someOtherFile.csv"
        |  }
        |  ]
        |}""".stripMargin
    )
    val fetchedFiles = List(
      FetchedFile("someOtherFileId", "someOtherQuery", "s3://someBucket/someOtherFile.csv")
    )
    val actual = fetcFileRequest.as[FetchFileRequest]
    actual shouldBe FetchFileRequest(fetchedFiles, batches)
  }

}
