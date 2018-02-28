package com.gu.util

import com.gu.util.apigateway.ApiGatewayRequest
import org.scalatest.FlatSpec
import org.scalatest.Matchers._
import play.api.libs.json.{ JsResult, JsSuccess, Json }

class ApiGatewayHandlerReadsTest extends FlatSpec {

  "ApiGatewayHandler" should "deserialise the headers too when receiving a request from Stripe" in {

    val eventBodySimple: String = "{\'hello\': \'it is some stripe event info but what exactly, I do not mind right now\'}"

    val eventHeaders = Map(
      "SomeHeader1" -> "testvalue",
      "Content-Type" -> "application/json",
      "Stripe-Signature" -> "t=1513759648,v1=longAlphanumericString")
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
        |    "queryStringParameters": null,
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

    val expected: JsResult[ApiGatewayRequest] = JsSuccess(
      ApiGatewayRequest(
        queryStringParameters = None,
        body = eventBodySimple,
        headers = Some(eventHeaders)))

    val event: JsResult[ApiGatewayRequest] = Json.parse(validApiGatewayEventJson).validate[ApiGatewayRequest]

    event should be(expected)
  }

}
