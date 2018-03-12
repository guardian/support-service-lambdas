package com.gu.identityBackfill

import java.io.{ ByteArrayInputStream, ByteArrayOutputStream }

import com.gu.effects.TestingRawEffects
import com.gu.identityBackfill.EndToEndData._
import org.scalatest.{ FlatSpec, Matchers }
import play.api.libs.json.Json

class EndToEndHandlerTest extends FlatSpec with Matchers {

  it should "manage an end to end call" in {

    val stream = new ByteArrayInputStream(identityBackfillRequest.getBytes(java.nio.charset.StandardCharsets.UTF_8))
    val os = new ByteArrayOutputStream()
    val config = new TestingRawEffects(false, 200, responses)

    //execute
    Handler.default(config.rawEffects)(stream, os, null)

    val responseString = new String(os.toByteArray(), "UTF-8")

    val expectedResponse =
      s"""
         |{"statusCode":"200","headers":{"Content-Type":"application/json"},"body":"Success"}
         |""".stripMargin
    responseString jsonMatches expectedResponse
  }

}

object EndToEndData {

  implicit class JsonMatcher(private val actual: String) {
    import Matchers._
    def jsonMatches(expected: String) = {
      val expectedJson = Json.parse(expected)
      val actualJson = Json.parse(actual)
      actualJson should be(expectedJson)
    }
  }

  def responses: Map[String, (Int, String)] = Map()

  val identityBackfillRequest: String =
    """
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
      |        "apiClientId": "a",
      |        "apiToken": "b"
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
      |    "body": "[\"hello!!!!\"]",
      |    "isBase64Encoded": false
      |}
    """.stripMargin

}
