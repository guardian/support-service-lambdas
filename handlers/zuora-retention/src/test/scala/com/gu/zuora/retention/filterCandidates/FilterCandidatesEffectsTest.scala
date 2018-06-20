package com.gu.zuora.retention.filterCandidates

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.test.EffectsTest
import org.scalatest.{FlatSpec, Matchers}

class FilterCandidatesEffectsTest extends FlatSpec with Matchers {
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

    testOutputStream.toString shouldBe "{\"jobId\":\"testJobId\",\"uri\":\"s3://zuora-retention-dev/testJobId/doNoProcess.csv\",\"dryRun\":false}"
  }
}
