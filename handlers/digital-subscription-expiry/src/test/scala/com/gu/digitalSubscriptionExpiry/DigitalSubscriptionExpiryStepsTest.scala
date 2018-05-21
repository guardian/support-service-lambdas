package com.gu.digitalSubscriptionExpiry

import java.time.LocalDate
import com.gu.cas.SevenDay
import com.gu.digitalSubscriptionExpiry.responses.DigitalSubscriptionApiResponses._
import com.gu.digitalSubscriptionExpiry.responses.{Expiry, ExpiryType, SuccessResponse}
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.{AccountId, AccountSummaryResult}
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.{SubscriptionId, SubscriptionName, SubscriptionResult}
import com.gu.util.apigateway.ResponseModels.{ApiResponse, Headers}
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse, URLParams}
import com.gu.util.reader.Types.FailableOp
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json
import scalaz.{-\/, \/-}

class DigitalSubscriptionExpiryStepsTest extends FlatSpec with Matchers {

  val validTokenResponse = {
    val expiry = Expiry(
      expiryDate = LocalDate.of(1985, 10, 26),
      expiryType = ExpiryType.SUB,
      subscriptionCode = Some(SevenDay),
      provider = Some("G99")
    )
    apiResponse(SuccessResponse(expiry), "200")
  }

  val successfulResponseFromZuora = -\/(ApiResponse("123", new Headers, "valid zuora response"))

  def getSubId(s: SubscriptionId): FailableOp[SubscriptionResult] = {
    if (s.get == "validZuoraSubId") {
      val response = SubscriptionResult(
        id = s,
        name = SubscriptionName("someSubName"),
        accountId = AccountId("someAccountId"),
        casActivationDate = None,
        customerAcceptanceDate = LocalDate.of(2015, 10, 21),
        startDate = LocalDate.of(2015, 10, 21),
        endDate = LocalDate.of(2015, 10, 26),
        ratePlans = Nil
      )
      \/-(response)
    } else
      -\/(notFoundResponse)
  }
  def getAccount(accountId: AccountId): FailableOp[AccountSummaryResult] = {
    if (accountId.value != "someAccountId") {
      -\/(ApiGatewayResponse.internalServerError("zuoraError"))
    } else {
      val summary = AccountSummaryResult(
        accountId = AccountId("someAccountId"),
        billToLastName = "someBillToLastName",
        billToPostcode = Some("someBilltoPostCode"),
        soldToLastName = "someSoldToLastName",
        soldToPostcode = Some("someSoldtoPostCode")
      )
      \/-(summary)
    }
  }
  def getSubExpiry(password: String, subscriptionResult: SubscriptionResult, accountSummaryResult: AccountSummaryResult): FailableOp[Unit] = successfulResponseFromZuora

  def getTokenExpiry(token: String): FailableOp[Unit] = {
    if (token == "validToken") -\/(validTokenResponse) else \/-(())
  }

  def skipActivationDateUpdate(queryStringParameters: Option[URLParams], sub: SubscriptionResult): Boolean = false

  def setActivationDate(subscriptionId: SubscriptionId): FailableOp[Unit] = \/-(())

  val digitalSubscriptionExpirySteps = {
    DigitalSubscriptionExpirySteps(
      getEmergencyTokenExpiry = getTokenExpiry,
      getSubscription = getSubId,
      setActivationDate = setActivationDate,
      getAccountSummary = getAccount,
      getSubscriptionExpiry = getSubExpiry,
      skipActivationDateUpdate = skipActivationDateUpdate,
    )
  }

  it should "trim leading spaces and zeroes and return subscription from zuora" in {
    val request =
      """{
    |      "subscriberId" : "   0000validZuoraSubId ",
    |      "password" : "somePassword"
    |    }

  """.stripMargin

    val actual = digitalSubscriptionExpirySteps.steps(ApiGatewayRequest(None, Some(request), None))

    actual.shouldBe(successfulResponseFromZuora)
  }

  it should "return not found for valid zuora id with no password provided" in {
    val request =
      """{
    |      "subscriberId" : "validZuoraSubId"
    |    }

  """.stripMargin

    val actual = digitalSubscriptionExpirySteps.steps(ApiGatewayRequest(None, Some(request), None))

    verifyResponse(
      actualResponse = actual,
      expectedBody = expectedNotFoundResponseBody,
      expectedStatus = "404"
    )
  }

  it should "handle emergency tokens" in {

    val request =
      """{
    |      "subscriberId" : "validToken"
    |    }

  """.stripMargin

    val actual = digitalSubscriptionExpirySteps.steps(ApiGatewayRequest(None, Some(request), None))

    val expectedResponseBody =
      """{
        |    "expiry" : {
        |        "expiryDate" : "1985-10-26",
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

    val actual = digitalSubscriptionExpirySteps.steps(ApiGatewayRequest(None, Some(request), None))

    verifyResponse(
      actualResponse = actual,
      expectedBody = expectedBadRequestResponseBody,
      expectedStatus = "400"
    )
  }

  it should "return bad request if subscriber id is missing from request" in {

    val request = "{}"

    val actual = digitalSubscriptionExpirySteps.steps(ApiGatewayRequest(None, Some(request), None))

    verifyResponse(
      actualResponse = actual,
      expectedBody = expectedBadRequestResponseBody,
      expectedStatus = "400"
    )
  }

  it should "return 404 if subscriberId is not valid" in {

    val request =
      """{
    |      "subscriberId" : "invalidId"
    |    }

  """.stripMargin

    val actual = digitalSubscriptionExpirySteps.steps(ApiGatewayRequest(None, Some(request), None))

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
    actualResponse match {
      case -\/(actualApiResponse) =>
        val expectedReponseBodyJson = Json.parse(expectedBody)
        val actualResponseBodyJson = Json.parse(actualApiResponse.body)
        (actualApiResponse.statusCode, actualResponseBodyJson).shouldBe((expectedStatus, expectedReponseBodyJson))
      case \/-(_) => fail("response expected to be left ")
    }
  }

  val expectedBadRequestResponseBody =
    """{
      |    "error": {
      |        "message": "Mandatory data missing from request",
      |        "code": -50
      |    }
      |}
    """.stripMargin

  val expectedNotFoundResponseBody =
    """{
      |    "error": {
      |       "message": "Unknown subscriber",
      |        "code": -90
      |    }
      |}
    """.stripMargin
}

