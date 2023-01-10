package com.gu.util

import com.gu.util.resthttp.RestRequestMaker
import com.gu.util.resthttp.Types.{ClientSuccess, GenericError}
import okhttp3._
import org.scalatest._
import org.scalatest.matchers.should.Matchers._
import play.api.libs.json._
import org.scalatest.matchers
import org.scalatest.flatspec.AsyncFlatSpec

class RestRequestMakerTest extends AsyncFlatSpec {

  case class BasicAccountInfo(id: String)
  implicit val read = Json.reads[BasicAccountInfo]
  implicit val readUnit = new Reads[Unit] {
    override def reads(json: JsValue): JsResult[Unit] = JsSuccess(())
  }

  "buildRequest" should "set the headers and url correctly" in {
    val hdr = Map("apiSecretAccessKey" -> "fakePassword")
    val request = RestRequestMaker.buildRequest(hdr, "https://www.test.com/route-test", _.get())
    assert(request.header("apiSecretAccessKey") == "fakePassword")
    assert(request.url.toString == "https://www.test.com/route-test")
  }

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

  "convertResponseToCaseClass" should "return a left[String] for an unsuccessful response code" in {
    val response = constructTestResponse(500)
    val either = RestRequestMaker.httpIsSuccessful(response)
    assert(either == GenericError("HTTP request was unsuccessful"))
  }

  it should "return a left[String] if the body of a successful response cannot be de-serialized to that case class" in {
    val either = RestRequestMaker.toResult[BasicAccountInfo](validZuoraNoOtherFields)
    val result = either.mapFailure(first => GenericError(first.message.split(":")(0)))
    assert(result == GenericError("Error when converting JSON response to case class"))
  }

  it should "return a right[T] if the body of a successful response deserializes to T" in {
    val either = RestRequestMaker.toResult[BasicAccountInfo](validUpdateSubscriptionResult)
    val basicInfo = BasicAccountInfo("id123")
    either should be(ClientSuccess(basicInfo))
  }

  it should "return a right[Unit] if the body of a successful response deserializes to Unit" in {
    val either = RestRequestMaker.toResult[Unit](validUpdateSubscriptionResult)
    either should be(ClientSuccess(()))
  }

  it should "run success end to end GET" in {
    // TODO tests for POST/PUT as well
    def response(request: Request): Response = {
      println(s"request: $request")
      if (
        request.method() == "GET"
        && request.url().toString == "https://www.test.com/getget"
        && request.header("a") == "b"
      )
        // check body for post/put
        constructTestResponse(200, validUpdateSubscriptionResult)
      else {
        println(s"oh, ${request.url()} ${request.headers()}")
        constructTestResponse(404)
      }
    }
    val actual =
      new RestRequestMaker.Requests(Map("a" -> "b"), "https://www.test.com", response, _ => ClientSuccess(()))
        .get[BasicAccountInfo]("/getget")
    val basicInfo = BasicAccountInfo("id123")

    actual should be(ClientSuccess(basicInfo))
  }

}
