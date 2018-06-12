package com.gu.zuora.reports

import org.scalatest.Matchers._
import org.scalatest._
import play.api.libs.json.Json

class FetchFileRequestTest extends AsyncFlatSpec {

  val batches = List(
    FileInfo("candidatesFileId", "candidatesQuery"),
    FileInfo("exclusionFileId", "exclusionQuery")
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

  it should "deserialise successfully already fetched files in request  " in {
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
        |  "fileId" : "someOtherFileId",
        |  "uri" : "s3://someBucket/someOtherFile.csv"
        |  }
        |  ]
        |}""".stripMargin
    )
    val fetchedFiles = List(
      FetchedFileInfo("someOtherFileId", "s3://someBucket/someOtherFile.csv")
    )
    val actual = fetcFileRequest.as[FetchFileRequest]
    actual shouldBe FetchFileRequest(fetchedFiles, batches)
  }

}
