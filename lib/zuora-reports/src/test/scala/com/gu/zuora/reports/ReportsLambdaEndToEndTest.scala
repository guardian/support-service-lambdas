package com.gu.zuora.reports

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.effects.TestingRawEffects.{HTTPResponse, POSTRequest}
import com.gu.effects.{FakeFetchString, TestingRawEffects}
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.Stage
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.ZuoraRestConfig
import com.gu.zuora.reports.EndToEndData._
import com.gu.zuora.reports.Runner._
import com.gu.zuora.reports.aqua.{AquaJobResponse, AquaQuery, AquaQueryRequest, ZuoraAquaRequestMaker}
import org.scalatest.Assertion
import play.api.libs.json.{Json, Reads, Writes}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class ReportsLambdaEndToEndTest extends AnyFlatSpec with Matchers {

  case class FakeQueryRequest(id: String, dryRun: Boolean) extends QuerierRequest
  implicit val reads = Json.reads[FakeQueryRequest]

  def generateAquaQuery(req: FakeQueryRequest) = AquaQueryRequest(
    name = "testJob",
    queries = List(
      AquaQuery(
        name = "query1",
        query = "select something from somethingElse",
      ),
    ),
  )

  it should "handle query request" in {

    val postResponses1 = Map(POSTRequest("/batch-query/", aquaQueryRequest) -> HTTPResponse(200, aquaQueryResponse))

    def handlerToTest(requests: Requests)(querierRequest: FakeQueryRequest) =
      Querier(generateAquaQuery, requests)(querierRequest)

    val inputJson =
      """
          |{
          |"id" : "someId",
          |"dryRun": false
          |}
        """.stripMargin

    val (response, bla) = getResultAndRequests[FakeQueryRequest, QuerierResponse](
      input = inputJson,
      postResponses = postResponses1,
      handlerToTest = handlerToTest,
    )

    val expectedResponse =
      """
          |{
          | "name" : "testJob",
          | "jobId" : "aquaJobId",
          | "dryRun": false
          |}""".stripMargin
    response jsonMatches expectedResponse
  }

  it should "handle job status request" in {
    val jobInput =
      """
          |{
          | "jobId" : "aquaJobId",
          | "dryRun" : false
          |}
        """.stripMargin

    val responses = Map("/batch-query/jobs/aquaJobId" -> HTTPResponse(200, aquaJobResponse))

    def getJobResultAdapter(requests: Requests) = GetJobResult(requests.get[AquaJobResponse]) _
    val (response, bla) = getResultAndRequests[JobResultRequest, JobResult](
      input = jobInput,
      responses = responses,
      handlerToTest = getJobResultAdapter,
    )

    val expected =
      """{
          |   "name" : "testJob",
          |   "jobId" : "aquaJobId",
          |   "status" : "completed",
          |   "batches" : [{
          |   "name" : "query1",
          |   "fileId": "someFileId"
          |   }],
          |   "dryRun" : false,
          |   "tries" : 9
          |}
        """.stripMargin

    response jsonMatches expected

  }
}

object Runner {

  def getResultAndRequests[REQUEST, RESPONSE](
      input: String,
      responses: Map[String, HTTPResponse] = Map(),
      postResponses: Map[POSTRequest, HTTPResponse] = Map(),
      handlerToTest: Requests => REQUEST => ClientFailableOp[RESPONSE],
  )(implicit r: Reads[REQUEST], w: Writes[RESPONSE]): (String, List[TestingRawEffects.BasicRequest]) = {
    val stream = new ByteArrayInputStream(input.getBytes(java.nio.charset.StandardCharsets.UTF_8))
    val os = new ByteArrayOutputStream()

    val rawEffects = new TestingRawEffects(defaultCode = 200, responses = responses, postResponses = postResponses)

    def wire(zuoraRestConfig: ZuoraRestConfig) = handlerToTest(
      ZuoraAquaRequestMaker(rawEffects.response, zuoraRestConfig),
    )
    // execute
    ReportsLambda[REQUEST, RESPONSE](
      Stage("CODE"),
      FakeFetchString.fetchString,
      LambdaIO(stream, os, null),
      wire,
    )

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
      |    "name": "testJob",
      |    "id": "aquaJobId",
      |    "version": "1.0",
      |    "format": "CSV"
      |}
    """.stripMargin

  // this has to be all in the same line otherwise it would not match the expected request and the test would fail
  val aquaQueryRequest =
    """{"format":"csv","version":"1.0","name":"testJob","encrypted":"none","useQueryLabels":"true","dateTimeUtc":"true","queries":[{"name":"query1","query":"select something from somethingElse","type":"zoqlexport"}]}"""

  val aquaJobResponse =
    """
      |{
      |    "batches": [
      |        {
      |            "localizedStatus": "completed",
      |            "apiVersion": "91.0",
      |            "recordCount": 0,
      |            "fileId": "someFileId",
      |            "batchId": "someBatchId",
      |            "batchType": "zoqlexport",
      |            "full": true,
      |            "status": "completed",
      |            "name": "query1",
      |            "message": "",
      |            "query": "select something from some other thing"
      |        }],
      |    "encrypted": "none",
      |    "useLastCompletedJobQueries": false,
      |    "status": "completed",
      |    "name": "testJob",
      |    "id": "jobId",
      |    "version": "1.0",
      |    "format": "CSV",
      |    "startTime": "2018-05-31T11:41:35+0100"
      |}
    """.stripMargin
}
