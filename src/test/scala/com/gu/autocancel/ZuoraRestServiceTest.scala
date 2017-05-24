package com.gu.autocancel

import com.gu.autoCancel.ZuoraModels._
import com.gu.autoCancel.ZuoraReaders._
import com.gu.autoCancel.{ ZuoraRestConfig, ZuoraRestService }
import okhttp3._
import org.scalatest._
import Matchers._
import com.gu.autoCancel.APIGatewayResponse._
import play.api.libs.json.{ JsValue, Json }
import scalaz.{ -\/, \/- }

class ZuoraRestServiceTest extends AsyncFlatSpec {

  val fakeConfig = ZuoraRestConfig("https://www.test.com", "fakeUser", "fakePassword")
  val fakeRestService = new ZuoraRestService(fakeConfig)

  "buildRequest" should "set the apiSecretAccessKey header correctly" in {
    val request = fakeRestService.buildRequest(fakeConfig, "route-test").get.build()
    assert(request.header("apiSecretAccessKey") == "fakePassword")
  }

  "buildRequest" should "set the apiAccessKeyId header correctly" in {
    val request = fakeRestService.buildRequest(fakeConfig, "route-test").get.build()
    assert(request.header("apiAccessKeyId") == "fakeUser")
  }

  "buildRequest" should "construct an appropriate url" in {
    val request = fakeRestService.buildRequest(fakeConfig, "route-test").get.build()
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
    val either = fakeRestService.convertResponseToCaseClass[UpdateSubscriptionResult](response)
    assert(either == -\/(internalServerError("Request to Zuora was unsuccessful")))
  }

  it should "return a left[String] if the body of a successful response cannot be de-serialized" in {
    val response = constructTestResponse(200)
    val either = fakeRestService.convertResponseToCaseClass[UpdateSubscriptionResult](response)
    assert(either == -\/(internalServerError("Error when converting Zuora response to case class")))
  }

  it should "return a right[T] if the body of a successful response deserializes to T" in {
    val response = constructTestResponse(200, validUpdateSubscriptionResult)
    val either = fakeRestService.convertResponseToCaseClass[UpdateSubscriptionResult](response)
    assert(either == \/-(UpdateSubscriptionResult(true, "id123")))
  }

}
