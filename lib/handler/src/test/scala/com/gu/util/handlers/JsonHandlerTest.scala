package com.gu.util.handlers

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json

import scala.util.{Failure, Success}

class JsonHandlerTest extends FlatSpec with Matchers {

  case class TestRequest(requestValue:String)
  implicit val reqFormat = Json.format[TestRequest]
  case class TestResponse(responseValue:String)
  implicit val resFormat = Json.format[TestResponse]

  def testOperation(req : TestRequest) =
    if (req.requestValue == "testValue")
      Success(TestResponse("success"))
    else
      Failure(LambdaException("error!"))

  it should "execute operation and serialise/deserialise request and response" in {
    val input =
      """
        |{
        |"requestValue": "testValue"
        |}
      """.stripMargin

    val inputStream = new ByteArrayInputStream(input.getBytes)
    val outputStream = new ByteArrayOutputStream()
    val lambdaIo = LambdaIO(inputStream, outputStream, null)
    JsonHandler(lambdaIo, testOperation)

    Json.parse(outputStream.toString).as[TestResponse] shouldBe TestResponse("success")
  }
}
