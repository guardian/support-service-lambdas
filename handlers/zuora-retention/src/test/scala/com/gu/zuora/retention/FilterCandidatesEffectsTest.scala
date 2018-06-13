package com.gu.zuora.retention

import java.io.ByteArrayInputStream

import com.gu.test.EffectsTest
import com.gu.zuora.reports.dataModel.FetchedFile
import org.scalatest.{FlatSpec, Matchers}

class FilterCandidatesEffectsTest extends FlatSpec with Matchers {
  it should "do something" taggedAs EffectsTest in {
    val input =
      """
    |{
    |"fetched": [
    |    {
    |      "fileId": "someId",
    |      "uri": "s3://zuora-reports-dev/exclusionQuery.csv",
    |      "name": "exclusionQuery"
    |    },
    |    {
    |      "fileId": "someId",
    |      "uri": "s3://zuora-reports-dev/candidatesQuery.csv",
    |      "name" : "candidatesQuery"
    |    }
    |  ]
    |  }
  """.stripMargin

    val testInputStream = new ByteArrayInputStream(input.getBytes)
    val files = List(
      FetchedFile("asdasd", "candidatesQuery", "s3://zuora-reports-dev/someFile.csv"),
      FetchedFile("asdasd", "exclusionQuery", "s3://zuora-reports-dev/exclusionQuery.csv")
    )

    val request = FilterCandidatesRequest(files)
    FilterCandidates(testInputStream, null, null)
    "bla" shouldBe ("bla")
  }
}
