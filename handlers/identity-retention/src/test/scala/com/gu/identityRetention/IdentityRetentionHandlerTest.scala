package com.gu.identityRetention

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}
import com.gu.effects.RawEffects
import com.gu.test.EffectsTest
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import org.scalatest.{Assertion, FlatSpec, Matchers}
import play.api.libs.json.Json

class IdentityRetentionHandlerTest extends FlatSpec with Matchers {

  it should "return 404 if the identity id is not linked to any Zuora billing accounts" taggedAs EffectsTest in {

    val stream = new ByteArrayInputStream(dummyRequest("12345").getBytes(java.nio.charset.StandardCharsets.UTF_8))
    val os = new ByteArrayOutputStream()

    Handler.runWithEffects(RawEffects.response, RawEffects.stage, RawEffects.s3Load, LambdaIO(stream, os, null))

    val actualResponse = new String(os.toByteArray, "UTF-8")

    actualResponse jsonMatches (noPreviousRelationship)

  }

  it should "return an ongoing relationship response (200) if identity id is linked to an active sub" taggedAs EffectsTest in {

    val stream = new ByteArrayInputStream(dummyRequest("78973512").getBytes(java.nio.charset.StandardCharsets.UTF_8))
    val os = new ByteArrayOutputStream()

    Handler.runWithEffects(RawEffects.response, RawEffects.stage, RawEffects.s3Load, LambdaIO(stream, os, null))

    val actualResponse = new String(os.toByteArray, "UTF-8")

    actualResponse jsonMatches (ongoingRelationship)

  }

  it should "return 200 if the identity id has a cancelled sub" taggedAs EffectsTest in {

    val stream = new ByteArrayInputStream(dummyRequest("78973513").getBytes(java.nio.charset.StandardCharsets.UTF_8))
    val os = new ByteArrayOutputStream()

    Handler.runWithEffects(RawEffects.response, RawEffects.stage, RawEffects.s3Load, LambdaIO(stream, os, null))

    val actualResponse = new String(os.toByteArray, "UTF-8")

    actualResponse jsonMatches (cancelledRelationship)

  }

  implicit class JsonMatcher(private val actual: String) {
    def jsonMatches(expected: String): Assertion = {
      val expectedJson = Json.parse(expected)
      val actualJson = Json.parse(actual)
      actualJson should be(expectedJson)
    }
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

  val ongoingRelationship =
    """
      |{
      |"statusCode":"200",
      |"headers":{"Content-Type":"application/json"},
      |"body":"{\n  \"ongoingRelationship\" : true\n}"
      |}""".stripMargin

  val cancelledRelationship =
    """
      |{
      |"statusCode":"200",
      |"headers":{"Content-Type":"application/json"},
      |"body":"{\n  \"ongoingRelationship\" : false,\n  \"serviceEndDate\" : \"2018-04-04\"\n}"
      |}""".stripMargin

  val noPreviousRelationship =
    """
      |{
      |"statusCode":"404",
      |"headers":{"Content-Type":"application/json"},
      |"body":"{\n  \"previousRelationship\" : false\n}"
      |}""".stripMargin

}
