package com.gu.identityRetention

import com.gu.effects.TestingRawEffects
import com.gu.effects.TestingRawEffects.{HTTPResponse, POSTRequest}
import com.gu.identityRetention.HasActiveZuoraAccounts.IdentityQueryResponse
import com.gu.identityRetention.Types.IdentityId
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import com.gu.util.zuora.ZuoraQuery.QueryResult
import org.scalatest.{FlatSpec, Matchers}
import scalaz.{-\/, \/-}

class HasActiveZuoraAccountsTest extends FlatSpec with Matchers {

  val noZuoraAccounts = QueryResult[IdentityQueryResponse](Nil, 0, true, None)

  val singleZuoraAccount = QueryResult[IdentityQueryResponse](List(IdentityQueryResponse("123", "Active")), 1, true, None)

  it should "return a left(404) if the identity id is not linked to any Zuora accounts" in {
    val effects = new TestingRawEffects(postResponses = ZuoraQueryMocks.postResponse(Nil))
    val requestMaker = ZuoraRestRequestMaker(effects.response, ZuoraRestConfig("https://zuora", "user", "pass"))
    val zuoraQuerier = ZuoraQuery(requestMaker)
    val zuoraCheck = HasActiveZuoraAccounts(IdentityId(321), zuoraQuerier)
    val expected = -\/(ApiGatewayResponse.notFound("Identity user has no linked Zuora accounts"))
    zuoraCheck should be(expected)
  }

  it should "return a left(500) if the call to Zuora fails" in {
    val effects = new TestingRawEffects(postResponses = ZuoraQueryMocks.failedPOST)
    val requestMaker = ZuoraRestRequestMaker(effects.response, ZuoraRestConfig("https://zuora", "user", "pass"))
    val zuoraQuerier = ZuoraQuery(requestMaker)
    val zuoraCheck = HasActiveZuoraAccounts(IdentityId(321), zuoraQuerier)
    val expected = -\/(ApiGatewayResponse.internalServerError("Failed to retrieve the identity user's details from Zuora"))
    zuoraCheck should be(expected)
  }

  it should "return a right if we find an identity id linked to a billing account" in {
    val effects = new TestingRawEffects(postResponses = ZuoraQueryMocks.postResponse(List(ZuoraQueryMocks.activeResult)))
    val requestMaker = ZuoraRestRequestMaker(effects.response, ZuoraRestConfig("https://zuora", "user", "pass"))
    val zuoraQuerier = ZuoraQuery(requestMaker)
    val zuoraCheck = HasActiveZuoraAccounts(IdentityId(321), zuoraQuerier)
    val expected = \/-(())
    zuoraCheck should be(expected)
  }

}

object ZuoraQueryMocks {

  val activeResult = """
                       |{
                       |  "Id": "321",
                       |  "Status": "Active"
                       |}
                       |"""

  val cancelledResult = """
                          |{
                          |  "Id": "321",
                          |  "Status": "Cancelled"
                          |}
                          |"""

  def postResponse(zuoraAccounts: List[String]): Map[POSTRequest, HTTPResponse] = {

    val accountQueryResponse: String =
      s"""
         |{
         |    "records": [${zuoraAccounts.mkString(",")}],
         |    "size": ${zuoraAccounts.size},
         |    "done": true
         |}
    """.stripMargin

    Map(
      POSTRequest("/action/query", """{"queryString":"select id, status from account where IdentityId__c = '321'"}""") -> HTTPResponse(200, accountQueryResponse)
    )
  }

  val failedPOST = Map(
    POSTRequest("/action/query", """{"queryString":"select id, status from account where IdentityId__c = '321'"}""") -> HTTPResponse(500, """{ error: Internal server error }""")
  )

}
