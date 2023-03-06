package com.gu.identityBackfill.zuora

import com.gu.effects.TestingRawEffects
import com.gu.effects.TestingRawEffects.{HTTPResponse, POSTRequest}
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.util.resthttp.Types.ClientSuccess
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class CountZuoraAccountsForIdentityIdTest extends AnyFlatSpec with Matchers {

  it should "get one result for an identity id if there already is one" in {
    val effects = new TestingRawEffects(postResponses = CountZuoraAccountsForIdentityIdData.postResponses(true))
    val requestMaker = ZuoraRestRequestMaker(effects.response, ZuoraRestConfig("https://zuora", "user", "pass"))
    val get = CountZuoraAccountsForIdentityId(ZuoraQuery(requestMaker)) _
    val contacts = get(IdentityId("1234"))
    val expected = ClientSuccess(1)
    contacts should be(expected)
  }

}

object CountZuoraAccountsForIdentityIdData {

  def postResponses(hasResult: Boolean): Map[POSTRequest, HTTPResponse] = {

    val result = """
                   |{
                   |  "Id": "12345678"
                   |}
                   |"""

    val accountQueryResponse: String =
      s"""
         |{
         |    "records": [
         |      ${if (hasResult) result else ""}
         |    ],
         |    "size": ${if (hasResult) "1" else "0"},
         |    "done": true
         |}
    """.stripMargin

    Map(
      POSTRequest("/action/query", """{"queryString":"SELECT Id FROM Account where IdentityId__c='1234'"}""")
        -> HTTPResponse(200, accountQueryResponse),
    )
  }

}
