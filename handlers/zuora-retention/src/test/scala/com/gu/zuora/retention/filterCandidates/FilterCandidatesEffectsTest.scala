package com.gu.zuora.retention.filterCandidates

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.test.EffectsTest
import play.api.libs.json.Json
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class FilterCandidatesEffectsTest extends AnyFlatSpec with Matchers {
  it should "filter candidates with exclusion results" taggedAs EffectsTest in {
    val input =
      """
    |{
    |"jobId" : "testJobId",
    |"fetched": [
    |    {
    |      "fileId": "someId",
    |      "uri": "s3://zuora-retention-dev/effectsTest/exclusionQuery.csv",
    |      "name": "exclusionQuery"
    |    },
    |    {
    |      "fileId": "someId",
    |      "uri": "s3://zuora-retention-dev/effectsTest/candidatesQuery.csv",
    |      "name" : "candidatesQuery"
    |    }
    |  ],
    |"dryRun" : false
    |  }""".stripMargin

    val testInputStream = new ByteArrayInputStream(input.getBytes)
    val testOutputStream = new ByteArrayOutputStream()

    FilterCandidates(testInputStream, testOutputStream, null)

    val expectedOutput = Json.parse(
      """
        {
          "jobId":"testJobId",
          "uri":"s3://zuora-retention-dev/testJobId/doNoProcess.csv",
          "dryRun":false
          }
      """,
    )

    Json.parse(testOutputStream.toString) shouldBe expectedOutput
  }
}
