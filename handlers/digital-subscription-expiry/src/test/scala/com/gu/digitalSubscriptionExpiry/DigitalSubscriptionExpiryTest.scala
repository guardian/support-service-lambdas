package com.gu.digitalSubscriptionExpiry

import com.gu.util.apigateway.ApiGatewayRequest
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json

class DigitalSubscriptionExpiryTest extends FlatSpec with Matchers {
  def getSteps() = DigitalSubscriptionExpirySteps()
  it should "handle emergency tokens" in {

    val request = """
  |{
  |      "appId": "membership.theguardian.com",
  |      "deviceId": "ROBERTO MADE THIS UP",
  |      "subscriberId" : "G99TESTID",
  |      "password" : "password"
  |    }

""".stripMargin

    val actual = getSteps().steps(ApiGatewayRequest(None, request, None))
    actual.isLeft shouldBe (true)

    //todo change response for the value we actually expect
    val expectedResponseBody =
      """{
        |    "expiry" : {
        |        "expiryDate" : "1985-10-26",
        |        "expiryType" : "sub",
        |        "content" : "SevenDay",
        |        "provider" : "test provider"
        |    }
        |}
      """.stripMargin

    val expectedReponseBodyJson = Json.parse(expectedResponseBody)
    val actualApiResponse = actual.toEither.left.get
    val actualResponseBodyJson = Json.parse(actualApiResponse.body)

    actualResponseBodyJson.shouldBe(expectedReponseBodyJson)
  }

}

