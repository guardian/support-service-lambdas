package com.gu.util

import com.gu.util.apigateway.ApiGatewayResponse._
import com.gu.util.zuora.ZuoraModels._
import com.gu.util.zuora.ZuoraQueryPaymentMethod.{ AccountId, PaymentMethodId }
import com.gu.util.zuora.ZuoraReaders._
import com.gu.util.zuora.ZuoraRestRequestMaker
import okhttp3._
import org.scalatest.Matchers._
import org.scalatest._
import play.api.libs.json.{ JsValue, Json }

import scalaz.{ -\/, \/- }

class ZuoraRestServiceTest extends AsyncFlatSpec {

  val fakeZConfig = ZuoraRestConfig("https://www.test.com", "fakeUser", "fakePassword")

  "buildRequest" should "set the apiSecretAccessKey header correctly" in {
    val request = ZuoraRestRequestMaker.buildRequest(fakeZConfig)("route-test").get.build()
    assert(request.header("apiSecretAccessKey") == "fakePassword")
  }

  "buildRequest" should "set the apiAccessKeyId header correctly" in {
    val request = ZuoraRestRequestMaker.buildRequest(fakeZConfig)("route-test").get.build()
    assert(request.header("apiAccessKeyId") == "fakeUser")
  }

  "buildRequest" should "construct an appropriate url" in {
    val request = ZuoraRestRequestMaker.buildRequest(fakeZConfig)("route-test").get.build()
    assert(request.url.toString == "https://www.test.com/route-test")
  }

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
      .build()
    response
  }

  "convertResponseToCaseClass" should "return a left[String] for an unsuccessful response code" in {
    val response = constructTestResponse(500)
    val either = ZuoraRestRequestMaker.convertResponseToCaseClass[Unit](response)
    assert(either == -\/(internalServerError("Request to Zuora was unsuccessful")))
  }

  it should "return a left[String] if the body of a successful response cannot be de-serialized with a zuora success response" in {
    val response = constructTestResponse(200)
    val either = ZuoraRestRequestMaker.convertResponseToCaseClass[Unit](response)
    assert(either == -\/(internalServerError("Error when reading common fields from zuora")))
  }

  it should "return a left[String] if the body of a successful response cannot be de-serialized to that case class" in {
    val response = constructTestResponse(200, validZuoraNoOtherFields)
    val either = ZuoraRestRequestMaker.convertResponseToCaseClass[BasicAccountInfo](response)
    assert(either == -\/(internalServerError("Error when converting Zuora response to case class")))
  }

  it should "return a right[T] if the body of a successful response deserializes to T" in {
    val response = constructTestResponse(200, validUpdateSubscriptionResult)
    val either = ZuoraRestRequestMaker.convertResponseToCaseClass[BasicAccountInfo](response)
    val basicInfo = BasicAccountInfo(AccountId("id123"), 1.2, PaymentMethodId("pmid"))
    either should be(\/-(basicInfo))
  }

  it should "return a right[Unit] if the body of a successful response deserializes to Unit" in {
    val response = constructTestResponse(200, validUpdateSubscriptionResult)
    val either = ZuoraRestRequestMaker.convertResponseToCaseClass[Unit](response)
    either should be(\/-(()))
  }

  it should "return a left[String] if the body of a successful http response has a zuora failed in it" in {
    val response = constructTestResponse(200, validFailedUpdateSubscriptionResult)
    val either = ZuoraRestRequestMaker.convertResponseToCaseClass[Unit](response)
    assert(either == -\/(internalServerError("Received failure result from Zuora during autoCancellation")))
  }

}
