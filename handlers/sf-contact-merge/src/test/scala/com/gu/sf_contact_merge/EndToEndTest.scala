package com.gu.sf_contact_merge

import com.gu.effects.TestingRawEffects.{HTTPResponse, POSTRequest}
import com.gu.effects.{FakeFetchString, TestingRawEffects}
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.apigateway.ResponseModels.{ApiResponse, Headers}
import com.gu.util.config.Stage
import org.scalatest.{FlatSpec, Matchers}

class EndToEndTest extends FlatSpec with Matchers {

  import Runner._

  it should "accept a request in the format we expect" in {

    val expected = ApiResponse(
      statusCode = "200",
      body =
        """{
          |  "message" : "Success"
          |}""".stripMargin,
      headers = Headers()
    )

    val body =
      """
        |{
        |   "fullContactId":"newSFCont",
        |   "billingAccountZuoraIds":[
        |      "2c92c0f9624bbc5f016253e573970b16",
        |      "2c92c0f8644618e30164652a558c6e20"
        |   ],
        |   "accountId":"sfacc",
        |   "identityId":"identest"
        |}
      """.stripMargin
    val input = ApiGatewayRequest(None, Some(body), None, None)

    val (responseString, requests) = getResultAndRequests(input)

    responseString should be(expected)

  }

}

object Runner {

  def getResultAndRequests(input: ApiGatewayRequest): (ApiResponse, List[TestingRawEffects.BasicRequest]) = {

    val result = Handler.operationForEffects(
      Stage("DEV"),
      FakeFetchString.fetchString,
      EndToEndTest.mock.response
    ).map(_.steps(input)).apiResponse

    (result, EndToEndTest.mock.requestsAttempted)
  }

}

object EndToEndTest {

  val accountQueryRequest =
    """{"queryString":"
      |SELECT BillToId, IdentityId__c, sfContactId__c
      | FROM Account
      | WHERE Id = '2c92c0f9624bbc5f016253e573970b16' or Id = '2c92c0f8644618e30164652a558c6e20'
      |"}""".stripMargin.replaceAll("""\n""", "")

  val accountQueryResponse =
    """{
      |    "records": [
      |        {
      |            "BillToId": "2c92c0f8644618e30164652a55986e21",
      |            "Id": "2c92c0f8644618e30164652a558c6e20",
      |            "IdentityId__c": "identest",
      |            "sfContactId__c": "oldSFCont"
      |        },
      |        {
      |            "BillToId": "2c92c0f9624bbc5f016253e5739b0b17",
      |            "Id": "2c92c0f9624bbc5f016253e573970b16",
      |            "IdentityId__c": "identest",
      |            "sfContactId__c": "sfsf2"
      |        }
      |    ],
      |    "size": 2,
      |    "done": true
      |}""".stripMargin

  val contactQueryRequest =
    """{"queryString":"
      |SELECT Id, WorkEmail FROM Contact WHERE Id = '2c92c0f8644618e30164652a55986e21' or Id = '2c92c0f9624bbc5f016253e5739b0b17'
      |"}""".stripMargin.replaceAll("""\n""", "")

  val contactQueryResponse =
    """{
      |    "records": [
      |        {
      |            "WorkEmail": "peppa.pig@guardian.co.uk",
      |            "Id": "2c92c0f8644618e30164652a55986e21"
      |        },
      |        {
      |            "WorkEmail": "peppa.pig@guardian.co.uk",
      |            "Id": "2c92c0f9624bbc5f016253e5739b0b17"
      |        }
      |    ],
      |    "size": 2,
      |    "done": true
      |}""".stripMargin.replaceAll("""\n""", "")

  val sfAuthReq =
    "client_id=clientsfclient&" +
      "client_secret=clientsecretsfsecret&" +
      "username=usernamesf&" +
      "password=passSFpasswordtokentokenSFtoken&" +
      "grant_type=password"

  val sfAuthResponse = """{"access_token":"aaaccess", "instance_url":"https://iinstance"}"""

  val updateAccountRequestBody = """{"crmId":"sfacc","sfContactId__c":"newSFCont","IdentityId__c":"identest"}"""
  val removeIdentityBody = """{"IdentityID__c":""}"""
  val addIdentityBody = """{"IdentityID__c":"identest"}"""

  val updateAccountResponse = HTTPResponse(200, """{"Success": true}""")

  val mock = new TestingRawEffects(postResponses = Map(
    POSTRequest("/services/oauth2/token", sfAuthReq) -> HTTPResponse(200, sfAuthResponse),
    POSTRequest("/action/query", accountQueryRequest) -> HTTPResponse(200, accountQueryResponse),
    POSTRequest("/action/query", contactQueryRequest) -> HTTPResponse(200, contactQueryResponse),
    POSTRequest("/accounts/2c92c0f9624bbc5f016253e573970b16", updateAccountRequestBody, "PUT") -> updateAccountResponse,
    POSTRequest("/accounts/2c92c0f8644618e30164652a558c6e20", updateAccountRequestBody, "PUT") -> updateAccountResponse,
    POSTRequest("/data/v20.0/sobjects/Contact/oldSFCont", removeIdentityBody, "PATCH") -> updateAccountResponse,
    POSTRequest("/data/v20.0/sobjects/Contact/newSFCont", addIdentityBody, "PATCH") -> updateAccountResponse
  ))

}
