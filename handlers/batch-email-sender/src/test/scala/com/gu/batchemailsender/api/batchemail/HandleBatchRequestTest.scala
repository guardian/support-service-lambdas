package com.gu.batchemailsender.api.batchemail

import com.gu.util.apigateway.ApiGatewayRequest
import org.mockito.Mockito.{mock, verify, verifyNoInteractions, when}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.{JsObject, Json}

class HandleBatchRequestTest extends AnyFlatSpec with Matchers {
  "HandleBatchRequest" should "handle batch that could be successfully sent" in {
    val sendEmailBatchToSqsMock = mock[SendEmailBatchToSqs]()
    val handleEmailBatchRequest = new HandleEmailBatchRequest(sendEmailBatchToSqsMock)
    val firstMessage = Json.parse("""{ "first": "message" }""").as[JsObject]
    val secondMessage = Json.parse("""{ "second": "message" }""").as[JsObject]
    when(sendEmailBatchToSqsMock(List(
      firstMessage,
      secondMessage)
    )).thenReturn(List(SendResult(firstMessage, None), SendResult(secondMessage, None)))
    val response = handleEmailBatchRequest(
      ApiGatewayRequest(
        httpMethod = Some("POST"),
        queryStringParameters = None,
        body = Some("""
          |{
          | "messages": [
          |   { "first": "message" },
          |   { "second": "message" }
          | ]
          |}
          |""".stripMargin),
        headers = None,
        path = None,
      ),
    )
    response.statusCode.toInt shouldBe 200
    Json.parse(response.body) shouldBe Json.obj("message" -> "Success")

    verify(sendEmailBatchToSqsMock).apply(List(firstMessage, secondMessage))
  }

  it should "handle batch that could not be successfully sent" in {
    val sendEmailBatchToSqsMock = mock[SendEmailBatchToSqs]()
    val handleEmailBatchRequest = new HandleEmailBatchRequest(sendEmailBatchToSqsMock)
    val firstMessage = Json.parse("""{ "first": "message" }""").as[JsObject]
    val secondMessage = Json.parse("""{ "second": "message" }""").as[JsObject]
    when(sendEmailBatchToSqsMock(List(
      firstMessage,
      secondMessage)
    )).thenReturn(List(SendResult(firstMessage, None), SendResult(secondMessage, Some(new RuntimeException("Error")))))
    val response = handleEmailBatchRequest(
      ApiGatewayRequest(
        httpMethod = Some("POST"),
        queryStringParameters = None,
        body = Some("""
          |{
          | "messages": [
          |   { "first": "message" },
          |   { "second": "message" }
          | ]
          |}
          |""".stripMargin),
        headers = None,
        path = None,
      ),
    )
    response.statusCode.toInt shouldBe 502
    Json.parse(response.body) shouldBe Json.obj("message" -> "Failed to send some Braze SQS messages.", "code" -> 502)

    verify(sendEmailBatchToSqsMock).apply(List(firstMessage, secondMessage))
  }

  it should "fail on an object that isn't compatible with email batch format" in {
    val sendEmailBatchToSqsMock = mock[SendEmailBatchToSqs]()
    val handleEmailBatchRequest = new HandleEmailBatchRequest(sendEmailBatchToSqsMock)
    val response = handleEmailBatchRequest(
      ApiGatewayRequest(
        httpMethod = Some("POST"),
        queryStringParameters = None,
        body = Some("""
          |{
          | "wrong": "object format"
          |}
          |""".stripMargin),
        headers = None,
        path = None,
      ),
    )
    response.statusCode.toInt shouldBe 400
    (Json.parse(response.body) \ "message").as[String] should startWith("Bad request: request body couldn't be parsed")

    verifyNoInteractions(sendEmailBatchToSqsMock)
  }
}
