package com.gu.util

import com.gu.util.zuora.RestRequestMaker.ClientFail
import com.gu.util.zuora.ZuoraAccount.{AccountId, PaymentMethodId}
import com.gu.util.zuora.ZuoraGetAccountSummary.BasicAccountInfo
import com.gu.util.zuora.{ZuoraDeps, ZuoraRestConfig, ZuoraRestRequestMaker}
import okhttp3._
import org.scalatest.Matchers._
import org.scalatest._
import play.api.libs.json.{JsValue, Json}
import scalaz.{-\/, \/-}

class ZuoraRestServiceTest extends AsyncFlatSpec {

  val fakeZConfig = ZuoraRestConfig("https://www.test.com", "fakeUser", "fakePassword")

  //  "buildRequest" should "set the apiSecretAccessKey header correctly" in {
  //    val request = ZuoraRestRequestMaker.buildRequest(fakeZConfig)("route-test").get.build()
  //    assert(request.header("apiSecretAccessKey") == "fakePassword")
  //  }
  //
  //  "buildRequest" should "set the apiAccessKeyId header correctly" in {
  //    val request = ZuoraRestRequestMaker.buildRequest(fakeZConfig)("route-test").get.build()
  //    assert(request.header("apiAccessKeyId") == "fakeUser")
  //  }
  //
  //  "buildRequest" should "construct an appropriate url" in {
  //    val request = ZuoraRestRequestMaker.buildRequest(fakeZConfig)("route-test").get.build()
  //    assert(request.url.toString == "https://www.test.com/route-test")
  //  }

  // Mocks and helper functions for handleFutureResponse testing
  val dummyJson = Json.parse(
    """{
      |  "body": "test"
      |}""".stripMargin
  )

  val validUpdateSubscriptionResult = Json.parse(
    """{
      |  "success": true,
      |  "id": "id123", "balance": 1.2, "defaultPaymentMethod": {"id": "pmid"}
      |}""".stripMargin
  )

  val validFailedUpdateSubscriptionResult = Json.parse(
    """{
      |  "success": false,
      |  "subscriptionId": "id123"
      |}""".stripMargin
  )

  val validZuoraNoOtherFields = Json.parse(
    """{
      |  "success": true
      |}""".stripMargin
  )

  def constructTestRequest(json: JsValue = dummyJson): Request = {
    val body = RequestBody.create(MediaType.parse("application/json"), json.toString)
    val request = new Request.Builder()
      .url("https://www.test.com")
      .post(body)
      .build()
    request
  }

  def constructTestResponse(responseCode: Int, json: JsValue = dummyJson): Response = {
    val response = new Response.Builder()
      .code(responseCode)
      .request(constructTestRequest())
      .protocol(Protocol.HTTP_1_1)
      .body(ResponseBody.create(MediaType.parse("application/json"), json.toString))
      .message("message?")
      .build()
    response
  }

  def internalServerError(message: String) = ClientFail(message)

  it should "return a left[String] if the body of a successful response cannot be de-serialized with a zuora success response" in {
    val either = ZuoraRestRequestMaker.zuoraIsSuccessful(dummyJson)
    assert(either == -\/(internalServerError("Error when reading common fields from zuora")))
  }

  it should "return a left[String] if the body of a successful http response has a zuora failed in it" in {
    val either = ZuoraRestRequestMaker.zuoraIsSuccessful(validFailedUpdateSubscriptionResult)
    assert(either == -\/(internalServerError("Received failure result from Zuora during autoCancellation")))
  }

  it should "run success end to end GET" in {
    // TODO tests for POST/PUT as well
    def response(request: Request): Response = {
      println(s"request: $request")
      if (request.method() == "GET"
        && request.url().toString == "https://www.test.com/getget"
        && request.header("apiSecretAccessKey") == "fakePassword"
        && request.header("apiAccessKeyId") == "fakeUser")
        // check body for post/put
        constructTestResponse(200, validUpdateSubscriptionResult)
      else {
        println(s"oh, ${request.url()} ${request.headers()}")
        constructTestResponse(404)
      }
    }
    val actual = ZuoraRestRequestMaker(ZuoraDeps(response, fakeZConfig)).get[BasicAccountInfo]("getget")
    val basicInfo = BasicAccountInfo(AccountId("id123"), 1.2, PaymentMethodId("pmid"))

    actual should be(\/-(basicInfo))
  }

}
