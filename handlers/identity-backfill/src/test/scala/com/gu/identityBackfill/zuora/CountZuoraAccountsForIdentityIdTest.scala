package com.gu.identityBackfill.zuora

import com.gu.effects.TestingRawEffects
import com.gu.effects.TestingRawEffects.{HTTPResponse, POSTRequest}
import com.gu.identityBackfill.Types._
import com.gu.util.zuora.{ZuoraDeps, ZuoraRestConfig}
import org.scalatest.{FlatSpec, Matchers}

import scalaz.\/-

class CountZuoraAccountsForIdentityIdTest extends FlatSpec with Matchers {

  it should "get one result for an identity id if there already is one" in {
    val effects = new TestingRawEffects(postResponses = CountZuoraAccountsForIdentityIdData.postResponses(true))
    val get = CountZuoraAccountsForIdentityId(ZuoraDeps(effects.response, ZuoraRestConfig("https://zuora", "user", "pass"))) _
    val contacts = get(IdentityId("1234"))
    val expected = \/-(1)
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
         |    "size": 1,
         |    "done": true
         |}
    """.stripMargin

    Map(
      POSTRequest("/action/query", """{"queryString":"SELECT Id FROM Account where IdentityId__c='1234'"}""")
        -> HTTPResponse(200, accountQueryResponse)
    )
  }

}
