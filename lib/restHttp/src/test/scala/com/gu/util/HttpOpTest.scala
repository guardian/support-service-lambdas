package com.gu.util

import com.gu.util.resthttp.HttpOp
import com.gu.util.resthttp.Types.ClientSuccess
import okhttp3._
import play.api.libs.json.Json
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class HttpOpTest extends AnyFlatSpec with Matchers {

  // Mocks and helper functions for handleFutureResponse testing
  val dummyJson = Json.parse(
    """{
      |  "body": "test"
      |}""".stripMargin,
  )

  val testRequest: Request = {
    val body = RequestBody.create(MediaType.parse("application/json"), dummyJson.toString)
    val request = new Request.Builder()
      .url("https://www.test.com")
      .post(body)
      .build()
    request
  }

  val testResponse: Response = {
    val response = new Response.Builder()
      .code(200)
      .request(testRequest)
      .protocol(Protocol.HTTP_1_1)
      .body(ResponseBody.create(MediaType.parse("application/json"), dummyJson.toString))
      .message("message?")
      .build()
    response
  }

  final class Mock(response: Response) {

    var invocationLog = List[Request]() // we want to check ordering of side effects...

    def apply(request: Request): Response = {
      invocationLog = invocationLog ++ List(request)
      response
    }

  }

  it should "run a request with no pre or post processing" in {
    val mock = new Mock(testResponse)

    val actual = HttpOp(mock.apply)
      .runRequest(testRequest)

    actual should be(ClientSuccess(testResponse))
    mock.invocationLog should be(List(testRequest))
  }

  it should "run a request with pre processing" in {
    val mock = new Mock(testResponse)

    val actual = HttpOp(mock.apply)
      .setupRequest[Int]({ case i if i == 1 => testRequest })
      .runRequest(1)

    actual should be(ClientSuccess(testResponse))
    mock.invocationLog should be(List(testRequest))
  }

  it should "run a request with pre processing 2 args" in {
    val mock = new Mock(testResponse)

    val actual = HttpOp(mock.apply)
      .setupRequestMultiArg[Int, String]({ case (i, s) if i == 1 && s == "hi" => testRequest })
      .runRequestMultiArg(1, "hi")

    actual should be(ClientSuccess(testResponse))
    mock.invocationLog should be(List(testRequest))
  }

  it should "run a request with pre processing 3 args" in {
    val mock = new Mock(testResponse)

    val actual = HttpOp(mock.apply)
      .setupRequestMultiArg[Int, String, Double]({ case (i, s, d) if i == 1 && s == "hi" && d == 2.0 => testRequest })
      .runRequestMultiArg(1, "hi", 2.0)

    actual should be(ClientSuccess(testResponse))
    mock.invocationLog should be(List(testRequest))
  }

  it should "run a request with post processing" in {
    val mock = new Mock(testResponse)

    val actual = HttpOp(mock.apply)
      .map({ case resp if resp == testResponse => "hi" })
      .runRequest(testRequest)

    actual should be(ClientSuccess("hi"))
    mock.invocationLog should be(List(testRequest))
  }

  it should "run a request with flatmap post processing" in {
    val mock = new Mock(testResponse)

    val actual = HttpOp(mock.apply)
      .flatMap({ case resp if resp == testResponse => ClientSuccess("hi") })
      .runRequest(testRequest)

    actual should be(ClientSuccess("hi"))
    mock.invocationLog should be(List(testRequest))
  }

}
