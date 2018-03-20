package com.gu.identityBackfill.zuora

import com.gu.effects.TestingRawEffects
import com.gu.effects.TestingRawEffects.{HTTPResponse, POSTRequest}
import com.gu.identityBackfill.Types._
import com.gu.util.zuora.{ZuoraDeps, ZuoraRestConfig}
import org.scalatest.{FlatSpec, Matchers}

import scalaz.\/-

class GetZuoraAccountsForEmailTest extends FlatSpec with Matchers {

  it should "get the accounts for an email" in {
    val effects = new TestingRawEffects(postResponses = GetZuoraAccountsForEmailData.postResponses)
    val get = GetZuoraAccountsForEmail(ZuoraDeps(effects.response, ZuoraRestConfig("https://zuora", "user", "pass"))) _
    val contacts = get(EmailAddress("email@address"))
    val expected = \/-(List(ZuoraAccountIdentitySFContact(AccountId("2c92a0fb4a38064e014a3f48f1663ad8"), IdentityId("10101010"), SFContactId("00110000011AABBAAB"))))
    contacts should be(expected)
  }

}

object GetZuoraAccountsForEmailData {

  def postResponses: Map[POSTRequest, HTTPResponse] = Map(
    POSTRequest("/action/query", """{"queryString":"SELECT Id FROM Contact where WorkEmail='email@address'"}""")
      -> HTTPResponse(200, contactQueryResponse),
    POSTRequest("/action/query", """{"queryString":"SELECT Id, IdentityId__c, sfContactId__c FROM Account where BillToId='2c92a0fb4a38064e014a3f48f1713ada'"}""")
      -> HTTPResponse(200, accountQueryResponse)
  )

  val accountQueryResponse: String =
    """
      |{
      |    "records": [
      |        {
      |            "IdentityId__c": "10101010",
      |            "sfContactId__c": "00110000011AABBAAB",
      |            "Id": "2c92a0fb4a38064e014a3f48f1663ad8"
      |        }
      |    ],
      |    "size": 1,
      |    "done": true
      |}
    """.stripMargin

  val contactQueryResponse: String =
    """
      |{
      |    "records": [
      |        {
      |            "Id": "2c92a0fb4a38064e014a3f48f1713ada"
      |        }
      |    ],
      |    "size": 1,
      |    "done": true
      |}
    """.stripMargin

}
