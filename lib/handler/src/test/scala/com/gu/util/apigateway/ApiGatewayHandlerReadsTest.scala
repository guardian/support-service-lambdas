package com.gu.util.apigateway

import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import org.scalatest.FlatSpec
import org.scalatest.Matchers._
import play.api.libs.json.{JsResult, JsSuccess, Json}

class ApiGatewayHandlerReadsTest extends FlatSpec {

  "ApiGatewayHandler" should "deserialise the headers too when receiving a request from Stripe" in {

    val eventBodySimple: String = "{\'hello\': \'it is some stripe event info but what exactly, I do not mind right now\'}"

    val eventHeaders = Map(
      "SomeHeader1" -> "testvalue",
      "Content-Type" -> "application/json",
      "Stripe-Signature" -> "t=1513759648,v1=longAlphanumericString"
    )
    val validApiGatewayEventJson =
      s"""
         |{
         |    "resource": "/stripe-customer-source-updated",
         |    "path": "/stripe-customer-source-updated",
         |    "httpMethod": "POST",
         |    "headers": {
         |        "SomeHeader1": "testvalue",
         |        "Content-Type": "application/json",
         |        "Stripe-Signature": "t=1513759648,v1=longAlphanumericString"
         |    },
         |    "queryStringParameters":  {
         |        "apiToken": "someToken",
         |        "isHealthcheck" : "true"
         |    },
         |    "pathParameters": null,
         |    "stageVariables": null,
         |    "requestContext": {
         |        "requestTime": "20/Dec/2017:08:47:29 +0000",
         |        "path": "/CODE/stripe-customer-source-updated",
         |        "accountId": "865473395570",
         |        "protocol": "HTTP/1.1",
         |        "resourceId": "ki15f3",
         |        "stage": "CODE",
         |        "requestTimeEpoch": 1513759649023,
         |        "requestId": "690ee95d-e562-11e7-9699-d79373eb6f8c",
         |        "identity": {
         |            "cognitoIdentityPoolId": null,
         |            "accountId": null,
         |            "cognitoIdentityId": null,
         |            "caller": null,
         |            "sourceIp": "54.187.174.169",
         |            "accessKey": null,
         |            "cognitoAuthenticationType": null,
         |            "cognitoAuthenticationProvider": null,
         |            "userArn": null,
         |            "userAgent": "Stripe/1.0 (+https://stripe.com/docs/webhooks)",
         |            "user": null
         |        },
         |        "resourcePath": "/stripe-customer-source-updated",
         |        "httpMethod": "POST",
         |        "apiId": "aefy0066u0"
         |    },
         |    "body": "$eventBodySimple",
         |    "isBase64Encoded": false
         |}
      """.stripMargin

    val queryStringParameters = Map(
      "apiToken" -> "someToken",
      "isHealthcheck" -> "true"
    )

    val expected: JsResult[ApiGatewayRequest] = JsSuccess(
      ApiGatewayRequest(
        queryStringParameters = Some(queryStringParameters),
        body = Some(eventBodySimple),
        headers = Some(eventHeaders)
      )
    )

    val event: JsResult[ApiGatewayRequest] = Json.parse(validApiGatewayEventJson).validate[ApiGatewayRequest]

    event should be(expected)
  }

  case class TestParams(testQueryParam: Option[String])
  object TestParams {
    implicit val testReads = Json.reads[TestParams]
  }

  it should "deserialise empty query string to case class" in {

    val noQueryParamsRequest = ApiGatewayRequest(queryStringParameters = None, body = None, headers = None)

    noQueryParamsRequest.queryParamsAsCaseClass[TestParams]() shouldBe ContinueProcessing(TestParams(None))
  }

  it should "deserialise query string to case class" in {
    val queryParams = Some(Map(
      "ignoredParam" -> "ignoredValue",
      "testQueryParam" -> "testValue"
    ))
    val noQueryParamsRequest = ApiGatewayRequest(queryStringParameters = queryParams, body = None, headers = None)
    noQueryParamsRequest.queryParamsAsCaseClass[TestParams]() shouldBe ContinueProcessing(TestParams(Some("testValue")))
  }

  case class NonOptionalParams(testQueryParam: String)
  object NonOptionalParams {
    implicit val nonOptionalReads = Json.reads[NonOptionalParams]
  }

  it should "return provided error if query params cannot be deserialised to provided case class" in {
    val queryParams = Some(Map(
      "wrongParamName" -> "someValue"
    ))
    val noQueryParamsRequest = ApiGatewayRequest(queryStringParameters = queryParams, body = None, headers = None)
    noQueryParamsRequest.queryParamsAsCaseClass[NonOptionalParams](ApiGatewayResponse.badRequest) shouldBe ReturnWithResponse(ApiGatewayResponse.badRequest)
  }

  it should "deserialise ApiGatewayHandlerParams with no query string" in {
    val noQueryParamsRequest = ApiGatewayRequest(queryStringParameters = None, body = None, headers = None)
    val expected = ApiGatewayHandlerParams(apiToken = None, isHealthcheck = false)
    noQueryParamsRequest.queryParamsAsCaseClass[ApiGatewayHandlerParams]() shouldBe ContinueProcessing(expected)

  }

  it should "deserialise ApiGatewayHandlerParams with token" in {
    val request = ApiGatewayRequest(queryStringParameters = Some(Map("apiToken" -> "tokenValue")), body = None, headers = None)
    val expected = ApiGatewayHandlerParams(apiToken = Some("tokenValue"), isHealthcheck = false)
    request.queryParamsAsCaseClass[ApiGatewayHandlerParams]() shouldBe ContinueProcessing(expected)

  }

  it should "deserialise ApiGatewayHandlerParams with isHealthcheck= true" in {
    val request = ApiGatewayRequest(queryStringParameters = Some(Map("isHealthcheck" -> "true")), body = None, headers = None)
    val expected = ApiGatewayHandlerParams(apiToken = None, isHealthcheck = true)

    request.queryParamsAsCaseClass[ApiGatewayHandlerParams]() shouldBe ContinueProcessing(expected)

  }

  it should "deserialise ApiGatewayHandlerParams with isHealthcheck= false" in {
    val request = ApiGatewayRequest(queryStringParameters = Some(Map("isHealthcheck" -> "false")), body = None, headers = None)
    val expected = ApiGatewayHandlerParams(apiToken = None, isHealthcheck = false)

    request.queryParamsAsCaseClass[ApiGatewayHandlerParams]() shouldBe ContinueProcessing(expected)
  }

  it should "deserialise ApiGatewayHandlerParams with isHealthcheck set to an invalid value" in {
    val request = ApiGatewayRequest(queryStringParameters = Some(Map("isHealthcheck" -> "invalidValue")), body = None, headers = None)
    val expected = ApiGatewayHandlerParams(apiToken = None, isHealthcheck = false)

    request.queryParamsAsCaseClass[ApiGatewayHandlerParams]() shouldBe ContinueProcessing(expected)
  }
}
