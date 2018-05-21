package com.gu.identityRetention

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}
import com.gu.effects.RawEffects
import com.gu.test.EffectsTest
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.apigateway.ResponseModels.ApiResponse
import org.scalatest.{Assertion, FlatSpec, Matchers}
import play.api.libs.json.Json

class IdentityRetentionHandlerTest extends FlatSpec with Matchers {

  it should "return 404 if the identity id is not linked to any Zuora billing accounts" taggedAs EffectsTest in {

    val stream = new ByteArrayInputStream(dummyRequest("12345").getBytes(java.nio.charset.StandardCharsets.UTF_8))
    val os = new ByteArrayOutputStream()

    Handler.runWithEffects(RawEffects.response, RawEffects.stage, RawEffects.s3Load, LambdaIO(stream, os, null))

    val actualResponse = new String(os.toByteArray, "UTF-8")
    val expectedResponse = responseString(ApiGatewayResponse.notFound("Identity user has no linked Zuora accounts"))

    actualResponse jsonMatches (expectedResponse)

  }

  it should "return 200 if the identity id is linked to a Zuora billing account" taggedAs EffectsTest in {

    val stream = new ByteArrayInputStream(dummyRequest("30000311").getBytes(java.nio.charset.StandardCharsets.UTF_8))
    val os = new ByteArrayOutputStream()

    Handler.runWithEffects(RawEffects.response, RawEffects.stage, RawEffects.s3Load, LambdaIO(stream, os, null))

    val actualResponse = new String(os.toByteArray, "UTF-8")
    val expectedResponse = responseString(ApiGatewayResponse.successfulExecution)

    actualResponse jsonMatches (expectedResponse)

  }

  implicit class JsonMatcher(private val actual: String) {
    def jsonMatches(expected: String): Assertion = {
      val expectedJson = Json.parse(expected)
      val actualJson = Json.parse(actual)
      actualJson should be(expectedJson)
    }
  }

  def responseString(apiResponse: ApiResponse) = {
    s"""
      |{
      |  "statusCode":"${apiResponse.statusCode}",
      |  "headers":{"Content-Type":"application/json"},
      |  "body":"${apiResponse.body}"
      |}""".stripMargin
  }

  def dummyRequest(identityId: String) = s"""
     |{
     |    "resource": "/retention-status",
     |    "path": "/retention-status",
     |    "httpMethod": "POST",
     |    "headers": {
     |        "CloudFront-Forwarded-Proto": "https",
     |        "CloudFront-Is-Desktop-Viewer": "true",
     |        "CloudFront-Is-Mobile-Viewer": "false",
     |        "CloudFront-Is-SmartTV-Viewer": "false",
     |        "CloudFront-Is-Tablet-Viewer": "false",
     |        "CloudFront-Viewer-Country": "US",
     |        "Content-Type": "application/json; charset=utf-8",
     |        "Host": "hosthosthost",
     |        "User-Agent": "Amazon CloudFront",
     |        "Via": "1.1 123.cloudfront.net (CloudFront), 1.1 123.cloudfront.net (CloudFront)",
     |        "X-Amz-Cf-Id": "hihi",
     |        "X-Amzn-Trace-Id": "trace123",
     |        "X-Forwarded-For": "1.1.1.1, 1.1.1.1",
     |        "X-Forwarded-Port": "443",
     |        "X-Forwarded-Proto": "https"
     |    },
     |    "queryStringParameters": {
     |        "identityId": "$identityId"
     |    },
     |    "pathParameters": null,
     |    "stageVariables": null,
     |    "requestContext": {
     |        "path": "/CODE/retention-status",
     |        "accountId": "12345",
     |        "resourceId": "321",
     |        "stage": "CODE",
     |        "requestId": "45678",
     |        "identity": {
     |            "cognitoIdentityPoolId": null,
     |            "accountId": null,
     |            "cognitoIdentityId": null,
     |            "caller": null,
     |            "apiKey": "",
     |            "sourceIp": "1.1.1.1",
     |            "accessKey": null,
     |            "cognitoAuthenticationType": null,
     |            "cognitoAuthenticationProvider": null,
     |            "userArn": null,
     |            "userAgent": "Amazon CloudFront",
     |            "user": null
     |        },
     |        "resourcePath": "/retention-status",
     |        "httpMethod": "GET",
     |        "apiId": "11111"
     |    },
     |    "isBase64Encoded": false
     |}
    """.stripMargin

}
