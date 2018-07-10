package com.gu.sf_contact_merge

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.effects.TestingRawEffects.{HTTPResponse, POSTRequest}
import com.gu.effects.{FakeFetchString, TestingRawEffects}
import com.gu.test.JsonMatchers._
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.config.Stage
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.{Json, OFormat}

class EndToEndTest extends FlatSpec with Matchers {

  import EndToEndTest._
  import Runner._

  it should "accept a request in the format we expect" in {

    val expected = ExpectedJsonFormat(
      "404",
      JsStringContainingJson(ExpectedBodyFormat("passed the prereq check")),
      Map("Content-Type" -> "application/json")
    )

    val body =
      """
        |{
        |   "fullContactId":"sfcont",
        |   "billingAccountZuoraIds":[
        |      "2c92c0f9624bbc5f016253e573970b16",
        |      "2c92c0f8644618e30164652a558c6e20"
        |   ],
        |   "accountId":"sfacc"
        |}
      """.stripMargin
    val input = ApiGatewayRequest(None, Some(body), None, None)

    implicit val jf = Json.writes[ApiGatewayRequest]
    val (responseString, requests) = getResultAndRequests(Json.stringify(Json.toJsObject(input)))

    responseString jsonMatchesFormat (expected)

  }

}

object Runner {

  def getResultAndRequests(input: String): (String, List[TestingRawEffects.BasicRequest]) = {
    val stream = new ByteArrayInputStream(input.getBytes(java.nio.charset.StandardCharsets.UTF_8))
    val os = new ByteArrayOutputStream()

    //execute
    Handler.runWithEffects(
      Stage("DEV"),
      FakeFetchString.fetchString,
      EndToEndTest.mock.response,
      LambdaIO(stream, os, null)
    )

    val responseString = new String(os.toByteArray, "UTF-8")

    (responseString, EndToEndTest.mock.requestsAttempted)
  }

}

object EndToEndTest {

  case class ExpectedJsonFormat(
    statusCode: String,
    body: JsStringContainingJson[ExpectedBodyFormat],
    headers: Map[String, String] = Map("Content-Type" -> "application/json")
  )

  case class ExpectedBodyFormat(message: String)

  implicit val mF: OFormat[ExpectedBodyFormat] = Json.format[ExpectedBodyFormat]
  implicit val apiF: OFormat[ExpectedJsonFormat] = Json.format[ExpectedJsonFormat]

  val accountQueryRequest =
    """{"queryString":"SELECT BillToId FROM Account WHERE Id = '2c92c0f9624bbc5f016253e573970b16' or Id = '2c92c0f8644618e30164652a558c6e20'"}"""

  val accountQueryResponse =
    """{
      |    "records": [
      |        {
      |            "BillToId": "2c92c0f8644618e30164652a55986e21",
      |            "Id": "2c92c0f8644618e30164652a558c6e20"
      |        },
      |        {
      |            "BillToId": "2c92c0f9624bbc5f016253e5739b0b17",
      |            "Id": "2c92c0f9624bbc5f016253e573970b16"
      |        }
      |    ],
      |    "size": 2,
      |    "done": true
      |}""".stripMargin

  val contactQueryRequest =
    """{"queryString":"SELECT WorkEmail FROM Contact WHERE Id = '2c92c0f8644618e30164652a55986e21' or Id = '2c92c0f9624bbc5f016253e5739b0b17'"}"""

  val contactQueryResponse =
    """{
      |    "records": [
      |        {
      |            "WorkEmail": "peppa.pig@guardian.co.uk",
      |            "Id": "2c92c0f8644618e30164652a55986e21"
      |        },
      |        {
      |            "WorkEmail": "peppa.pig@guardian.co.uk",
      |            "Id": "2c92c0f9624bbc5f016253e5739b0b17"
      |        }
      |    ],
      |    "size": 2,
      |    "done": true
      |}""".stripMargin

  val mock = new TestingRawEffects(postResponses = Map(
    POSTRequest("/action/query", accountQueryRequest) -> HTTPResponse(200, accountQueryResponse),
    POSTRequest("/action/query", contactQueryRequest) -> HTTPResponse(200, contactQueryResponse)
  ))

}
