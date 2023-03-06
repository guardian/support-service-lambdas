package com.gu.digitalSubscriptionExpiry

import java.time.LocalDate

import com.gu.cas.SevenDay
import com.gu.digitalSubscriptionExpiry.responses.DigitalSubscriptionApiResponses._
import com.gu.digitalSubscriptionExpiry.responses.{Expiry, ExpiryType, SuccessResponse}
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.{AccountId, AccountSummaryResult}
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.{SubscriptionId, SubscriptionName, SubscriptionResult}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.Types._
import play.api.libs.json.{JsSuccess, Json}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class DigitalSubscriptionExpiryStepsTest extends AnyFlatSpec with Matchers {

  val validTokenResponse = {
    val expiry = Expiry(
      expiryDate = LocalDate.of(1985, 10, 26),
      expiryType = ExpiryType.SUB,
      subscriptionCode = Some(SevenDay),
      provider = Some("G99"),
    )
    ApiGatewayResponse("200", SuccessResponse(expiry))
  }

  val successfulResponseFromZuora = ApiResponse("123", "valid zuora response")

  def getSubId(s: SubscriptionId): ApiGatewayOp[SubscriptionResult] = {
    if (s.value == "validZuoraSubId") {
      val response = SubscriptionResult(
        id = s,
        name = SubscriptionName("someSubName"),
        accountId = AccountId("someAccountId"),
        casActivationDate = None,
        customerAcceptanceDate = LocalDate.of(2015, 10, 21),
        startDate = LocalDate.of(2015, 10, 21),
        endDate = LocalDate.of(2015, 10, 26),
        ratePlans = Nil,
      )
      ContinueProcessing(response)
    } else
      ReturnWithResponse(notFoundResponse)
  }
  def getAccount(accountId: AccountId): ApiGatewayOp[AccountSummaryResult] = {
    if (accountId.value != "someAccountId") {
      ReturnWithResponse(ApiGatewayResponse.internalServerError("zuoraError"))
    } else {
      val summary = AccountSummaryResult(
        accountId = AccountId("someAccountId"),
        billToLastName = "someBillToLastName",
        billToPostcode = Some("someBilltoPostCode"),
        soldToLastName = "someSoldToLastName",
        soldToPostcode = Some("someSoldtoPostCode"),
        identityId = Some("12344"),
      )
      ContinueProcessing(summary)
    }
  }
  def getSubExpiry(
      password: String,
      subscriptionResult: SubscriptionResult,
      accountSummaryResult: AccountSummaryResult,
  ): ApiResponse =
    successfulResponseFromZuora

  def getTokenExpiry(token: String): ApiGatewayOp[Unit] = {
    if (token == "validToken") ReturnWithResponse(validTokenResponse) else ContinueProcessing(())
  }

  def skipActivationDateUpdate(queryStringParameters: UrlParams, sub: SubscriptionResult): Boolean = false

  def setActivationDate(subscriptionId: SubscriptionId): ApiGatewayOp[Unit] = ContinueProcessing(())

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

    val actual = digitalSubscriptionExpirySteps.steps(ApiGatewayRequest(None, None, Some(request), None, None, None))

    actual.shouldBe(successfulResponseFromZuora)
  }

  it should "return not found for valid zuora id with no password provided" in {
    val request =
      """{
    |      "subscriberId" : "validZuoraSubId"
    |    }

  """.stripMargin

    val actual = digitalSubscriptionExpirySteps.steps(ApiGatewayRequest(None, None, Some(request), None, None, None))

    verifyResponse(
      actualResponse = actual,
      expectedBody = expectedNotFoundResponseBody,
      expectedStatus = "404",
    )
  }

  it should "handle emergency tokens" in {

    val request =
      """{
    |      "subscriberId" : "validToken"
    |    }

  """.stripMargin

    val actual = digitalSubscriptionExpirySteps.steps(ApiGatewayRequest(None, None, Some(request), None, None, None))

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
      expectedStatus = "200",
    )
  }

  it should "return bad request if body is not valid json" in {

    val request =
      """
    |      subscriberId : G99IZXCEZLYF
    |

  """.stripMargin

    val actual = digitalSubscriptionExpirySteps.steps(ApiGatewayRequest(None, None, Some(request), None, None, None))

    verifyResponse(
      actualResponse = actual,
      expectedBody = expectedBadRequestResponseBody,
      expectedStatus = "400",
    )
  }

  it should "return bad request if subscriber id is missing from request" in {

    val request = "{}"

    val actual = digitalSubscriptionExpirySteps.steps(ApiGatewayRequest(None, None, Some(request), None, None, None))

    verifyResponse(
      actualResponse = actual,
      expectedBody = expectedBadRequestResponseBody,
      expectedStatus = "400",
    )
  }

  it should "return 404 if subscriberId is not valid" in {

    val request =
      """{
    |      "subscriberId" : "invalidId"
    |    }

  """.stripMargin

    val actual = digitalSubscriptionExpirySteps.steps(ApiGatewayRequest(None, None, Some(request), None, None, None))

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
      expectedStatus = "404",
    )
  }

  def verifyResponse(actualResponse: ApiResponse, expectedStatus: String, expectedBody: String) = {
    val expectedReponseBodyJson = Json.parse(expectedBody)
    val actualResponseBodyJson = Json.parse(actualResponse.body)
    (actualResponse.statusCode, actualResponseBodyJson).shouldBe((expectedStatus, expectedReponseBodyJson))
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

class DeserialiserTest extends AnyFlatSpec with Matchers {

  "deserialise url params" should "manage without the noActivation param" in {
    val json = """{"apiToken": "a", "apiClientId": "b"}"""

    Json.parse(json).validate[UrlParams] should be(JsSuccess(UrlParams(false)))

  }

  it should "manage with the noActivation param being false" in {
    val json = """{"apiToken": "a", "apiClientId": "b", "noActivation": "false"}"""

    Json.parse(json).validate[UrlParams] should be(JsSuccess(UrlParams(false)))
  }

  it should "manage with the noActivation param being true" in {
    val json = """{"apiToken": "a", "apiClientId": "b", "noActivation": "true"}"""

    Json.parse(json).validate[UrlParams] should be(JsSuccess(UrlParams(true)))
  }
}
