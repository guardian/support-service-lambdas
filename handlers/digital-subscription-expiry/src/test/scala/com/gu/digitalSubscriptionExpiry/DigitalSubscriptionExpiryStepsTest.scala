package com.gu.digitalSubscriptionExpiry

import com.gu.cas.SevenDay
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.{AccountId, AccountSummaryResult}
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.apigateway.ResponseModels.{ApiResponse, Headers}
import com.gu.util.reader.Types.FailableOp
import org.joda.time.{DateTime, LocalDate}
import org.joda.time.format.DateTimeFormat
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json
import scalaz.{-\/, \/-}
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.{SubscriptionId, SubscriptionResult}
import com.gu.digitalSubscriptionExpiry.common.CommonApiResponses._
class DigitalSubscriptionExpiryStepsTest extends FlatSpec with Matchers {

  val validTokenResponse = {
    val dateFormatter = DateTimeFormat.forPattern("dd/MM/yyyy")
    val expiry = Expiry(
      expiryDate = dateFormatter.parseLocalDate("26/10/1985"),
      expiryType = ExpiryType.SUB,
      subscriptionCode = Some(SevenDay),
      provider = Some("G99")
    )
    apiResponse(SuccessResponse(expiry), "200")
  }

  def getSubId(s: SubscriptionId): FailableOp[SubscriptionResult] = {
    -\/(notFoundResponse)
    //-\/(ApiResponse("123", new Headers, "bla"))
  }
  def getAccount(accountId: AccountId): FailableOp[AccountSummaryResult] = {
    if (accountId != "someAccountId") {
      -\/(ApiGatewayResponse.internalServerError("zuoraError"))
    } else {
      val summary = AccountSummaryResult(
        accountId = AccountId("someAccountId"),
        billToLastName = "someBillToLastName",
        billToPostcode = "someBilltoPostCode",
        soldToLastName = "someSoldToLastName",
        soldToPostcode = "someSoldtoPostCode"
      )
      \/-(summary)
    }
  }
  def getSubExpiry(password: String, subscriptionResult: SubscriptionResult, accountSummaryResult: AccountSummaryResult, date: LocalDate): FailableOp[ApiResponse] = {
    -\/(ApiResponse("123", new Headers, "bla"))
  }

  def getTokenExpiry(token: String): FailableOp[Unit] = {
    if (token == "validToken") -\/(validTokenResponse) else \/-(())
  }
  val digitalSubscriptionExpirySteps = {
    DigitalSubscriptionExpirySteps(
      getEmergencyTokenExpiry = getTokenExpiry,
      getSubscription = getSubId,
      getAccountSummary = getAccount,
      getSubscriptionExpiry = getSubExpiry,
      today = DateTime.now().toLocalDate

    )
  }

  it should "handle emergency tokens" in {

    val request =
      """{
    |      "subscriberId" : "validToken"
    |    }

  """.stripMargin

    val actual = digitalSubscriptionExpirySteps.steps(ApiGatewayRequest(None, request, None))

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

    val actual = digitalSubscriptionExpirySteps.steps(ApiGatewayRequest(None, request, None))

    verifyResponse(
      actualResponse = actual,
      expectedBody = expectedBadRequestResponseBody,
      expectedStatus = "400"
    )
  }

  it should "return bad request if subscriber id is missing from request" in {

    val request = "{}"

    val actual = digitalSubscriptionExpirySteps.steps(ApiGatewayRequest(None, request, None))

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
}

