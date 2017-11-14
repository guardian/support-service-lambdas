package com.gu.util

import com.gu.effects.{ StateHttp, StateHttpImpl }
import com.gu.util.apigateway.ApiGatewayResponse._
import com.gu.util.zuora.ZuoraModels._
import com.gu.util.zuora.ZuoraReaders._
import com.gu.util.zuora.ZuoraRestRequestMaker
import okhttp3._
import org.scalatest.Matchers._
import org.scalatest._
import play.api.libs.json.{ JsValue, Json }

import scalaz.{ -\/, \/- }

class ZuoraRestServiceTest extends AsyncFlatSpec {

  val fakeConfig = ZuoraRestConfig("https://www.test.com", "fakeUser", "fakePassword")
  val fakeETConfig = ETConfig(Map(99 -> "fakeETid"), "fakeClientId", "fakeClientSecret")
  val fakeRestService = new StateHttpImpl(fakeConfig, fakeETConfig)

  "buildRequest" should "set the apiSecretAccessKey header correctly" in {
    val request = fakeRestService.buildRequest("route-test").get.build()
    assert(request.header("apiSecretAccessKey") == "fakePassword")
  }

  "buildRequest" should "set the apiAccessKeyId header correctly" in {
    val request = fakeRestService.buildRequest("route-test").get.build()
    assert(request.header("apiAccessKeyId") == "fakeUser")
  }

  "buildRequest" should "construct an appropriate url" in {
    val request = fakeRestService.buildRequest("route-test").get.build()
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
      |  "subscriptionId": "id123"
      |}""".stripMargin
  )

  val validFailedUpdateSubscriptionResult = Json.parse(
    """{
      |  "success": false,
      |  "subscriptionId": "id123"
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
    val either = ZuoraRestRequestMaker.convertResponseToCaseClass[UpdateSubscriptionResult](response)
    assert(either == -\/(internalServerError("Request to Zuora was unsuccessful")))
  }

  it should "return a left[String] if the body of a successful response cannot be de-serialized" in {
    val response = constructTestResponse(200)
    val either = ZuoraRestRequestMaker.convertResponseToCaseClass[UpdateSubscriptionResult](response)
    assert(either == -\/(internalServerError("Error when converting Zuora response to case class")))
  }

  it should "return a right[T] if the body of a successful response deserializes to T" in {
    val response = constructTestResponse(200, validUpdateSubscriptionResult)
    val either = ZuoraRestRequestMaker.convertResponseToCaseClass[UpdateSubscriptionResult](response)
    assert(either == \/-(UpdateSubscriptionResult("id123")))
  }

  it should "return a left[String] if the body of a successful http response has a zuora failed in it" in {
    val response = constructTestResponse(200, validFailedUpdateSubscriptionResult)
    val either = ZuoraRestRequestMaker.convertResponseToCaseClass[UpdateSubscriptionResult](response)
    assert(either == -\/(internalServerError("Received failure result from Zuora during autoCancellation")))
  }

}
