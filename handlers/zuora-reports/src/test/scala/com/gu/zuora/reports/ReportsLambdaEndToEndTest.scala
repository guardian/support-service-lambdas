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

    def s3Load(s: Stage) = \/-(config)

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

  val config =
    """
   {
 |"stage": "DEV",
 |"trustedApiConfig": {
 |"apiToken": "devToken",
 |"tenantId": "someTenant"
 |},
 |"stepsConfig": {
 |"zuoraRestConfig": {
 |"baseUrl": "https://zuoraUrl.com",
 |"username": "someZuoraUserName",
 |"password": "someZuoraPassword"
 |},
 |"identityConfig": {
 |"baseUrl": "https://id.com",
 |"apiToken": "someToken"
 |},
 |"sfConfig": {
 |"url": "https://salesforce.com",
 |"client_id": "someClientId",
 |"client_secret": "someSecret",
 |"username": "someUserName",
 |"password": "somePassword",
 |"token": "someToken"
 |},
 |"emergencyTokens": {
 |"prefix": "SomePrefix",
 |"secret": "someSecret"
 |}
 |},
 |"etConfig": {
 |"etSendIDs": {
 |"pf1": "nothing",
 |"pf2": "nothing",
 |"pf3": "nothing",
 |"pf4": "nothing",
 |"cancelled": "nothing"
 |},
 |"clientId": "someId",
 |"clientSecret": "someSecret"
 |},
 |"stripe": {
 |"customerSourceUpdatedWebhook": {
 |"api.key.secret": "secret",
 |"au-membership.key.secret": "anotherSecret"
 |}
 |}
 |}
  """.stripMargin
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
      |    "name": "verificationQuery3",
      |    "id": "aquaJobId",
      |    "version": "1.0",
      |    "format": "CSV"
      |}
    """.stripMargin

  val aquaQueryRequest = """{"format":"csv","version":"1.0","name":"TestQuery","encrypted":"none","useQueryLabels":"true","dateTimeUtc":"true","queries":[{"name":"query1","query":"select something from somethingElse","type":"zoqlexport"}]}"""

}
