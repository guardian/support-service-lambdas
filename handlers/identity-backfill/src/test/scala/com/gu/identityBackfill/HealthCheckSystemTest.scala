package com.gu.identityBackfill

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.identityBackfill.HealthCheckData._
import com.gu.test.EffectsTest
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import org.scalatest.Assertion
import play.api.libs.json.Json
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

// this test runs the health check from locally. this means you can only run it manually
// you should also run the healthcheck in code after deploy
class HealthCheckSystemTest extends AnyFlatSpec with Matchers {

  it should "successfully run the health check using the local code against real backend" taggedAs EffectsTest in {

    val stream = new ByteArrayInputStream(healthcheckRequest.getBytes(java.nio.charset.StandardCharsets.UTF_8))
    val os = new ByteArrayOutputStream()

    // execute
    Handler.runForLegacyTestsSeeTestingMd(
      RawEffects.stage,
      GetFromS3.fetchString,
      RawEffects.response,
      LambdaIO(stream, os, null),
    )

    val responseString = new String(os.toByteArray, "UTF-8")

    val expectedResponse =
      """{
        |"statusCode":"200",
        |"headers":{"Content-Type":"application/json"},
        |"body":"{\n  \"message\" : \"Success\"\n}"
        |}
        |""".stripMargin

    responseString jsonMatches expectedResponse
  }

  // TODO test that the health check fails when it should!

  implicit class JsonMatcher(private val actual: String) {
    def jsonMatches(expected: String): Assertion = {
      val expectedJson = Json.parse(expected)
      val actualJson = Json.parse(actual)
      actualJson should be(expectedJson)
    }
  }

}

object HealthCheckData {

  def healthcheckRequest: String =
    s"""
       |{
       |    "resource": "/payment-failure",
       |    "path": "/payment-failure",
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
       |        "Via": "1.1 c154e1d9f76106d9025a8ffb4f4831ae.cloudfront.net (CloudFront), 1.1 11b20299329437ea4e28ea2b556ea990.cloudfront.net (CloudFront)",
       |        "X-Amz-Cf-Id": "hihi",
       |        "X-Amzn-Trace-Id": "Root=1-5a0f2574-4cb4d1534b9f321a3b777624",
       |        "X-Forwarded-For": "1.1.1.1, 1.1.1.1",
       |        "X-Forwarded-Port": "443",
       |        "X-Forwarded-Proto": "https"
       |    },
       |    "queryStringParameters": {
       |        "isHealthcheck": "true",
       |        "apiToken": "a"
       |    },
       |    "pathParameters": null,
       |    "stageVariables": null,
       |    "requestContext": {
       |        "path": "/CODE/payment-failure",
       |        "accountId": "865473395570",
       |        "resourceId": "ls9b61",
       |        "stage": "CODE",
       |        "requestId": "11111111-cbc2-11e7-a389-b7e6e2ab8316",
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
       |        "resourcePath": "/payment-failure",
       |        "httpMethod": "POST",
       |        "apiId": "11111"
       |    },
       |    "body": "",
       |    "isBase64Encoded": false
       |}
    """.stripMargin

}
