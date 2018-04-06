package com.gu.digitalSubscriptionExpiry

import com.gu.cas.PrefixedTokens
import com.gu.digitalSubscriptionExpiry.emergencyToken.EmergencyTokens
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.reader.Types.FailableOp
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json

class DigitalSubscriptionExpiryStepsTest extends FlatSpec with Matchers {

  val digitalSubscriptionExpirySteps = {
    val codec = PrefixedTokens(secretKey = "secret", emergencySubscriberAuthPrefix = "G99")
    val emergencyTokens = EmergencyTokens("G99", codec)
    DigitalSubscriptionExpirySteps(emergencyTokens)
  }

  it should "handle emergency tokens" in {

    val request =
    """{
    |      "subscriberId" : "G99IZXCEZLYF"
    |    }

  """.stripMargin

    val actual = digitalSubscriptionExpirySteps.steps(ApiGatewayRequest(None, request, None))

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

    verifyResponse(
      actualResponse = actual,
      expectedBody = expectedResponseBody,
      expectedStatus = "200"
    )
  }

  it should "return bad request if body is not valid json" in {

    val request =
      """
    |      subscriberId : G99IZXCEZLYF
    |

  """.stripMargin

    val actual = digitalSubscriptionExpirySteps.steps(ApiGatewayRequest(None, request, None))

    val expectedResponseBody =
      """{
        |    "error": {
        |        "message": "Mandatory data missing from request",
        |        "code": -50
        |    }
        |}
      """.stripMargin

    verifyResponse(
      actualResponse = actual,
      expectedBody = expectedResponseBody,
      expectedStatus = "400"
    )
  }

  it should "return bad request if subscriber id is missing from request" in {

    val request = "{}"

    val actual = digitalSubscriptionExpirySteps.steps(ApiGatewayRequest(None, request, None))

    val expectedResponseBody =
      """{
        |    "error": {
        |        "message": "Mandatory data missing from request",
        |        "code": -50
        |    }
        |}
      """.stripMargin

    verifyResponse(
      actualResponse = actual,
      expectedBody = expectedResponseBody,
      expectedStatus = "400"
    )
  }

  it should "return 404 if subscriberId is not valid" in {

    val request =
      """{
    |      "subscriberId" : "invalidId"
    |    }

  """.stripMargin

    val actual = digitalSubscriptionExpirySteps.steps(ApiGatewayRequest(None, request, None))

    val expectedResponseBody =
      """{
        |    "error": {
        |        "message": "Unknown subscriber",
        |        "code": -90
        |    }
        |}
      """.stripMargin

    verifyResponse(
      actualResponse = actual,
      expectedBody = expectedResponseBody,
      expectedStatus = "404"
    )
  }

  def verifyResponse(actualResponse: FailableOp[Unit], expectedStatus: String, expectedBody: String) = {
    actualResponse.isLeft shouldBe (true)

    val expectedReponseBodyJson = Json.parse(expectedBody)
    val actualApiResponse = actualResponse.toEither.left.get

    actualApiResponse.statusCode.shouldBe(expectedStatus)

    val actualResponseBodyJson = Json.parse(actualApiResponse.body)

    actualResponseBodyJson.shouldBe(expectedReponseBodyJson)
  }

}

