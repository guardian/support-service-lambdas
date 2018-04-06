package com.gu.digitalSubscriptionExpiry

import com.gu.cas.PrefixedTokens
import com.gu.digitalSubscriptionExpiry.emergencyToken.EmergencyTokens
import com.gu.util.apigateway.ApiGatewayRequest
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json

class DigitalSubscriptionExpiryStepsTest extends FlatSpec with Matchers {
  def getSteps() = {
    val codec = PrefixedTokens(secretKey = "secret", emergencySubscriberAuthPrefix = "G99")
    val emergencyTokens = EmergencyTokens("G99", codec)
    DigitalSubscriptionExpirySteps(emergencyTokens)
  }
  it should "handle emergency tokens" in {

    val request = """
  |{
  |      "subscriberId" : "G99IZXCEZLYF",
  |      "password" : "something"
  |    }

""".stripMargin

    val actual = getSteps().steps(ApiGatewayRequest(None, request, None))
    actual.isLeft shouldBe (true)

    //todo change response for the value we actually expect
    val expectedResponseBody =
      """{
        |    "expiry" : {
        |        "expiryDate" : "2017-07-21",
        |        "expiryType" : "sub",
        |        "content" : "SevenDay",
        |        "subscriptionCode" : "SevenDay",
        |        "provider" : "G99"
        |    }
        |}
      """.stripMargin

    val expectedReponseBodyJson = Json.parse(expectedResponseBody)
    val actualApiResponse = actual.toEither.left.get
    val actualResponseBodyJson = Json.parse(actualApiResponse.body)

    actualResponseBodyJson.shouldBe(expectedReponseBodyJson)
  }

}

