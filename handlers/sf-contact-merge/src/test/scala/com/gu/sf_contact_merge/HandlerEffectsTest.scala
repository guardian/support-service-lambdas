package com.gu.sf_contact_merge

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.test.EffectsTest
import com.gu.test.JsonMatchers._
import play.api.libs.json.{Json, OFormat}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class HandlerEffectsTest extends AnyFlatSpec with Matchers {

  import TestData._

  it should "return 404 if the lambda hasn't been implemented" taggedAs EffectsTest in {

    val actualResponse = runWithEffects(dummyRequest())

    val expected = ExpectedJsonFormat(
      "200",
      JsStringContainingJson(ExpectedBodyFormat("Success")),
      Map("Content-Type" -> "application/json"),
    )

    actualResponse jsonMatchesFormat expected
  }

}

object TestData {

  case class ExpectedJsonFormat(
      statusCode: String,
      body: JsStringContainingJson[ExpectedBodyFormat],
      headers: Map[String, String] = Map("Content-Type" -> "application/json"),
  )

  case class ExpectedBodyFormat(message: String)

  implicit val mF: OFormat[ExpectedBodyFormat] = Json.format[ExpectedBodyFormat]
  implicit val apiF: OFormat[ExpectedJsonFormat] = Json.format[ExpectedJsonFormat]

  def runWithEffects(mockRequest: String): String = {
    val stream = new ByteArrayInputStream(mockRequest.getBytes(java.nio.charset.StandardCharsets.UTF_8))
    val output = new ByteArrayOutputStream()
    Handler(stream, output, null)
    new String(output.toByteArray, "UTF-8")
  }

  def dummyRequest() =
    s"""
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
       |    "body": "",
       |    "queryStringParameters": {"isHealthcheck": "true"},
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
       |        "resourcePath": "/sf-contact-merge",
       |        "httpMethod": "POST",
       |        "apiId": "11111"
       |    },
       |    "isBase64Encoded": false
       |}
    """.stripMargin

}
