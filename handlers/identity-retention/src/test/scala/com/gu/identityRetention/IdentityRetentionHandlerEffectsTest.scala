package com.gu.identityRetention

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.test.EffectsTest
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import org.scalatest.Assertion
import play.api.libs.json.Json
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class IdentityRetentionHandlerEffectsTest extends AnyFlatSpec with Matchers {

  /** NOTE that these tests are liable to break because they are designed to run against real data in the CODE datalake
    *
    * Because time passes and identities come and go, you may need to look for new identity id's that fulfil the test
    * cases.
    */

  it should "return 404 if the identity id is not linked to any Zuora billing accounts" taggedAs EffectsTest in {
    // use an identity id that doesn't exist
    val actualResponse = runWithMock(dummyRequest("12345"))
    actualResponse jsonMatches (safeToDelete)
  }

  it should "return an ongoing relationship response (200) if identity id is linked to an active sub" taggedAs EffectsTest in {
    // use an identity id that has an active subscription
    val actualResponse = runWithMock(dummyRequest("105946507"))
    actualResponse jsonMatches (ongoingRelationship)
  }

  it should "return 200 if the identity id has only cancelled subs" taggedAs EffectsTest in {
    // use an identity id that has only cancelled/expired subscriptions, but still within 7 years retention
    val actualResponse = runWithMock(dummyRequest("100000321"))
    actualResponse jsonMatches (cancelledRelationship_RETAIN)
  }

  it should "return 200 if the identity id is only linked to Zuora accounts which are cancelled and outside retention period" taggedAs EffectsTest in {
    // use an identity id that has only very old cancelled/expired subscriptions, all of which are beyond 7 years retention
    val actualResponse = runWithMock(dummyRequest("100286679"))
    actualResponse jsonMatches (cancelledRelationship_DELETE)
  }

  implicit class JsonMatcher(private val actual: String) {
    def jsonMatches(expected: String): Assertion = {
      val expectedJson = Json.parse(expected)
      val actualJson = Json.parse(actual)
      actualJson should be(expectedJson)
    }
  }

  def runWithMock(mockRequest: String): String = {
    val stream = new ByteArrayInputStream(mockRequest.getBytes(java.nio.charset.StandardCharsets.UTF_8))
    val output = new ByteArrayOutputStream()
    // this will run against bigquery with your local application default credentials
    Handler.runForLegacyTestsSeeTestingMd(
      LambdaIO(stream, output, null),
    )
    new String(output.toByteArray, "UTF-8")
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
      |"body":"{\n  \"ongoingRelationship\" : true,\n  \"relationshipEndDate\" : \"2023-02-13\",\n  \"effectiveDeletionDate\" : \"2029-07-30\",\n  \"responseValidUntil\" : \"2023-09-01\"\n}"
      |}""".stripMargin

  val cancelledRelationship_RETAIN =
    """
      |{
      |"statusCode":"200",
      |"headers":{"Content-Type":"application/json"},
      |"body":"{\n  \"ongoingRelationship\" : false,\n  \"relationshipEndDate\" : \"2022-11-23\",\n  \"effectiveDeletionDate\" : \"2030-02-13\",\n  \"responseValidUntil\" : \"2023-09-01\"\n}"
      |}""".stripMargin

  val cancelledRelationship_DELETE =
    """
      |{
      |"statusCode":"200",
      |"headers":{"Content-Type":"application/json"},
      |"body":"{\n  \"ongoingRelationship\" : false,\n  \"relationshipEndDate\" : \"2012-10-27\",\n  \"effectiveDeletionDate\" : \"2019-10-27\",\n  \"responseValidUntil\" : \"2023-09-01\"\n}"
      |}""".stripMargin

  val safeToDelete =
    """
      |{
      |"statusCode":"404",
      |"headers":{"Content-Type":"application/json"},
      |"body":"{\n  \"message\" : \"User has no active relationships\"\n}"
      |}""".stripMargin

}
