package com.gu.util

import com.gu.util.resthttp.Types.{ClientSuccess, GenericError}
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import okhttp3._
import org.scalatest.matchers.should.Matchers._
import org.scalatest._
import play.api.libs.json._
import org.scalatest.matchers
import org.scalatest.flatspec.AsyncFlatSpec

class ZuoraRestServiceTest extends AsyncFlatSpec {

  val fakeZConfig = ZuoraRestConfig("https://www.test.com", "fakeUser", "fakePassword")

  // Mocks and helper functions for handleFutureResponse testing
  val dummyJson = Json.parse(
    """{
      |  "body": "test"
      |}""".stripMargin,
  )

  val validUpdateSubscriptionResult = Json.parse(
    """{
      |  "success": true,
      |  "id": "id123", "balance": 1.2, "defaultPaymentMethod": {"id": "pmid"}
      |}""".stripMargin,
  )

  val validFailedUpdateSubscriptionResult = Json.parse(
    """{
      |  "success": false,
      |  "subscriptionId": "id123"
      |}""".stripMargin,
  )

  val validZuoraNoOtherFields = Json.parse(
    """{
      |  "success": true
      |}""".stripMargin,
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

  it should "return a left[String] if the body of a successful response cannot be de-serialized with a zuora success response" in {
    val either = ZuoraRestRequestMaker.zuoraIsSuccessful(dummyJson)
    assert(either == GenericError("Error when reading common fields from zuora"))
  }

  it should "return a left[String] if the body of a successful http response has a zuora failed in it" in {
    val either = ZuoraRestRequestMaker.zuoraIsSuccessful(validFailedUpdateSubscriptionResult)
    val result = either.mapFailure(first => GenericError(first.message.split(":")(0)))
    assert(result == GenericError("Received a failure result from Zuora"))
  }

  case class BasicAccountInfo(id: String, balance: Double, defaultPaymentMethod: PaymentMethodId)

  case class PaymentMethodId(id: String)

  implicit val pmiReads = Json.reads[PaymentMethodId]
  implicit val baiReads = Json.reads[BasicAccountInfo]

  it should "run success end to end GET" in {
    // TODO tests for POST/PUT as well
    def response(request: Request): Response = {
      println(s"request: $request")
      if (
        request.method() == "GET"
        && request.url().toString == "https://www.test.com/getget"
        && request.header("apiSecretAccessKey") == "fakePassword"
        && request.header("apiAccessKeyId") == "fakeUser"
      )
        // check body for post/put
        constructTestResponse(200, validUpdateSubscriptionResult)
      else {
        println(s"oh, ${request.url()} ${request.headers()}")
        constructTestResponse(404)
      }
    }
    val actual = ZuoraRestRequestMaker(response, fakeZConfig).get[BasicAccountInfo]("getget")
    val basicInfo = BasicAccountInfo("id123", 1.2, PaymentMethodId("pmid"))

    actual should be(ClientSuccess(basicInfo))
  }

}
