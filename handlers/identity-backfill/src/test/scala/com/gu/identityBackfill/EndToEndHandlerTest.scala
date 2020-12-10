package com.gu.identityBackfill

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.effects.TestingRawEffects.{BasicRequest, HTTPResponse, POSTRequest}
import com.gu.effects.{FakeFetchString, TestingRawEffects}
import com.gu.identity.GetByEmailTest.TestData.dummyIdentityResponse
import com.gu.identityBackfill.EndToEndData._
import com.gu.identityBackfill.Runner._
import com.gu.identityBackfill.salesforce.getContact.GetSFContactSyncCheckFieldsTest
import com.gu.identityBackfill.zuora.{CountZuoraAccountsForIdentityIdData, GetZuoraAccountsForEmailData}
import com.gu.salesforce.auth.SalesforceAuthenticateData
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.Stage
import org.scalatest.Assertion
import play.api.libs.json.Json
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class EndToEndHandlerTest extends AnyFlatSpec with Matchers {

  it should "manage an end to end call in dry run mode" in {

    val (responseString, requests): (String, List[TestingRawEffects.BasicRequest]) = getResultAndRequests(identityBackfillRequest(true))

    val expectedResponse =
      """{
        |"statusCode":"200",
        |"headers":{"Content-Type":"application/json"},
        |"body":"{\n  \"message\" : \"Processing is not required: DRY RUN requested! skipping to the end\"\n}"
        |}
        |""".stripMargin

    responseString jsonMatches expectedResponse

    requests should be(List(
      BasicRequest("GET", ("/services/data/v43.0/query?q=SELECT Id, RecordTypeId, LastName, FirstName, OtherCountry, Email FROM Contact " +
        "WHERE AccountId = %27crmId%27").replace(" ", "%20"), ""),
      BasicRequest("POST", "/services/oauth2/token", "client_id=clientsfclient&client_secret=clientsecretsfsecret&username=usernamesf" +
        "&password=passSFpasswordtokentokenSFtoken&grant_type=password"),
      BasicRequest("POST", "/action/query", """{"queryString":"SELECT Id FROM Account where IdentityId__c='1234'"}"""),
      BasicRequest("POST", "/action/query",
        """{"queryString":"SELECT Id, IdentityId__c, sfContactId__c, CrmId FROM Account where BillToId='2c92a0fb4a38064e014a3f48f1713ada'"}"""),
      BasicRequest("POST", "/action/query", """{"queryString":"SELECT Id FROM Contact where WorkEmail='email@address'"}"""),
      BasicRequest("GET", "/user?emailAddress=email%40address", "")
    ))
  }

  it should "manage an end to end call" in {

    val (responseString, requests): (String, List[TestingRawEffects.BasicRequest]) = getResultAndRequests(identityBackfillRequest(false))

    val expectedResponse =
      """{
        |"statusCode":"200",
        |"headers":{"Content-Type":"application/json"},
        |"body":"{\n  \"message\" : \"Success\"\n}"
        |}
        |""".stripMargin

    responseString jsonMatches expectedResponse

    requests should be(List(
      BasicRequest("PATCH", "/services/data/v20.0/sobjects/Contact/00110000011AABBAAB", """{"IdentityID__c":"1234"}"""),
      BasicRequest("PUT", "/accounts/2c92a0fb4a38064e014a3f48f1663ad8", """{"IdentityId__c":"1234"}"""),
      BasicRequest("GET", ("/services/data/v43.0/query?q=SELECT Id, RecordTypeId, LastName, FirstName, OtherCountry, Email FROM Contact " +
        "WHERE AccountId = %27crmId%27").replace(" ", "%20"), ""),
      BasicRequest("POST", "/services/oauth2/token", "client_id=clientsfclient&client_secret=clientsecretsfsecret&username=usernamesf" +
        "&password=passSFpasswordtokentokenSFtoken&grant_type=password"),
      BasicRequest("POST", "/action/query", """{"queryString":"SELECT Id FROM Account where IdentityId__c='1234'"}"""),
      BasicRequest("POST", "/action/query",
        """{"queryString":"SELECT Id, IdentityId__c, sfContactId__c, CrmId FROM Account where BillToId='2c92a0fb4a38064e014a3f48f1713ada'"}"""),
      BasicRequest("POST", "/action/query", """{"queryString":"SELECT Id FROM Contact where WorkEmail='email@address'"}"""),
      BasicRequest("GET", "/user?emailAddress=email%40address", "")
    ))
  }

}

object Runner {

  def getResultAndRequests(input: String): (String, List[TestingRawEffects.BasicRequest]) = {
    val stream = new ByteArrayInputStream(input.getBytes(java.nio.charset.StandardCharsets.UTF_8))
    val os = new ByteArrayOutputStream()
    val config = new TestingRawEffects(200, responses, postResponses)

    //execute
    Handler.runForLegacyTestsSeeTestingMd(
      Stage("DEV"),
      FakeFetchString.fetchString,
      config.response,
      LambdaIO(stream, os, null)
    )

    val responseString = new String(os.toByteArray, "UTF-8")
    (responseString, config.requestsAttempted)
  }

  implicit class JsonMatcher(private val actual: String) {
    import Matchers._
    def jsonMatches(expected: String): Assertion = {
      val expectedJson = Json.parse(expected)
      val actualJson = Json.parse(actual)
      actualJson should be(expectedJson)
    }
  }

}

object EndToEndData {

  def responsesGetSFContactSyncCheckFieldsTest: Map[String, HTTPResponse] = {

    Map(
      ("/services/data/v43.0/query?q=SELECT Id, RecordTypeId, LastName, FirstName, OtherCountry, Email FROM Contact " +
        "WHERE AccountId = %27crmId%27").replace(" ", "%20") ->
        HTTPResponse(200, GetSFContactSyncCheckFieldsTest.dummyContact)
    )
  }

  def GetByEmailTestresponses: Map[String, HTTPResponse] = Map(
    "/user?emailAddress=email%40address" -> HTTPResponse(200, dummyIdentityResponse)
  )

  def responses: Map[String, HTTPResponse] =
    GetByEmailTestresponses ++ responsesGetSFContactSyncCheckFieldsTest
  def postResponses: Map[POSTRequest, HTTPResponse] =
    GetZuoraAccountsForEmailData.postResponses(false) ++
      CountZuoraAccountsForIdentityIdData.postResponses(false) ++
      SalesforceAuthenticateData.postResponses

  def identityBackfillRequest(dryRun: Boolean): String =
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
      |        "Via": "1.1 c154e1d9f76106d9025a8ffb4f4831ae.cloudfront.net, 1.1 11b20299329437ea4e28ea2b556ea990.cloudfront.net",
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
      |    "body": "{\\"emailAddress\\": \\"email@address\\", \\"dryRun\\": $dryRun}",
      |    "isBase64Encoded": false
      |}
    """.stripMargin

}
