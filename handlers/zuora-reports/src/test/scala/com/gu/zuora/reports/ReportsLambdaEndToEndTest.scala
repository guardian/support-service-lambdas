package com.gu.zuora.reports

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.effects.TestingRawEffects
import com.gu.effects.TestingRawEffects.{HTTPResponse, POSTRequest}
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.Stage
import org.scalatest.{Assertion, FlatSpec, Matchers}
import play.api.libs.json.Json
import scalaz.{\/, \/-}
import Runner._
import EndToEndData._

class ReportsLambdaEndToEndTest extends FlatSpec with Matchers {

  it should "handle query request" in {
    val querierInput =
      """
        |{
        |  "name": "TestQuery",
        |  "queries": [
        |    {
        |      "name": "query1",
        |      "query": "select something from somethingElse"
        |    }
        |  ]
        |}
      """.stripMargin
    val (response, bla) = getResultAndRequests(querierInput)

    response jsonMatches """{"jobId" : "aquaJobId"}"""
  }
}

object Runner {

  def getResultAndRequests(input: String): (String, List[TestingRawEffects.BasicRequest]) = {
    val stream = new ByteArrayInputStream(input.getBytes(java.nio.charset.StandardCharsets.UTF_8))
    val os = new ByteArrayOutputStream()

    val postResponses: Map[POSTRequest, HTTPResponse] = Map(
      POSTRequest("/batch-query/", aquaQueryRequest)
        -> HTTPResponse(200, aquaQueryResponse)
    )

    val rawEffects = new TestingRawEffects(defaultCode = 200, postResponses = postResponses)

    def s3Load(s: Stage) = \/-(TestingRawEffects.codeConfig)

    //execute
    ReportsLambda[QuerierRequest](rawEffects.response, rawEffects.stage, s3Load, LambdaIO(stream, os, null), Querier.apply)

    val responseString = new String(os.toByteArray, "UTF-8")

    (responseString, rawEffects.requestsAttempted)
  }

  implicit class JsonMatcher(private val actual: String) {

    import Matchers._

    def jsonMatches(expected: String): Assertion = {
      val expectedJson = Json.parse(expected)
      val actualJson = Json.parse(actual)
      actualJson should be(expectedJson)
    }
  }

}

object EndToEndData {

  val aquaQueryResponse =
    """
      |{
      |    "encrypted": "none",
      |    "useLastCompletedJobQueries": false,
      |    "batches": [
      |        {
      |            "localizedStatus": "pending",
      |            "recordCount": 0,
      |            "batchId": "someBatchId",
      |            "apiVersion": "91.0",
      |            "batchType": "zoqlexport",
      |            "full": true,
      |            "status": "pending",
      |            "name": "query1",
      |            "query": "select something from somethingElse"
      |        }
      |    ],
      |    "status": "submitted",
      |    "name": "TestQuery",
      |    "id": "aquaJobId",
      |    "version": "1.0",
      |    "format": "CSV"
      |}
    """.stripMargin

  //this has to be all in the same line otherwise it would not match the expected request and the test would fail
  val aquaQueryRequest = """{"format":"csv","version":"1.0","name":"TestQuery","encrypted":"none","useQueryLabels":"true","dateTimeUtc":"true","queries":[{"name":"query1","query":"select something from somethingElse","type":"zoqlexport"}]}"""

}
