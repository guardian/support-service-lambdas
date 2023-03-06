package com.gu.identityBackfill.zuora

import com.gu.effects.TestingRawEffects
import com.gu.effects.TestingRawEffects.{HTTPResponse, POSTRequest}
import com.gu.identityBackfill.Types._
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.util.resthttp.Types.ClientSuccess
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetZuoraAccountsForEmailTest extends AnyFlatSpec with Matchers {

  it should "get the accounts for an email with identity" in {
    val effects = new TestingRawEffects(postResponses = GetZuoraAccountsForEmailData.postResponses(true))
    val requestMaker = ZuoraRestRequestMaker(effects.response, ZuoraRestConfig("https://zuora", "user", "pass"))
    val contacts = GetZuoraAccountsForEmail(ZuoraQuery(requestMaker))(EmailAddress("email@address"))
    val expected = ClientSuccess(
      List(
        ZuoraAccountIdentitySFContact(
          AccountId("2c92a0fb4a38064e014a3f48f1663ad8"),
          Some(IdentityId("10101010")),
          SFContactId("00110000011AABBAAB"),
          CrmId("crmId"),
        ),
      ),
    )
    contacts should be(expected)
  }

  it should "get the accounts for an email without identity" in {
    val effects = new TestingRawEffects(postResponses = GetZuoraAccountsForEmailData.postResponses(false))
    val requestMaker = ZuoraRestRequestMaker(effects.response, ZuoraRestConfig("https://zuora", "user", "pass"))
    val contacts = GetZuoraAccountsForEmail(ZuoraQuery(requestMaker))(EmailAddress("email@address"))
    val expected = ClientSuccess(
      List(
        ZuoraAccountIdentitySFContact(
          AccountId("2c92a0fb4a38064e014a3f48f1663ad8"),
          None,
          SFContactId("00110000011AABBAAB"),
          CrmId("crmId"),
        ),
      ),
    )
    contacts should be(expected)
  }

}

object GetZuoraAccountsForEmailData {

  def postResponses(withIdentity: Boolean): Map[POSTRequest, HTTPResponse] = Map(
    POSTRequest("/action/query", """{"queryString":"SELECT Id FROM Contact where WorkEmail='email@address'"}""")
      -> HTTPResponse(200, contactQueryResponse),
    POSTRequest(
      "/action/query",
      """{"queryString":"SELECT Id, IdentityId__c, sfContactId__c, CrmId FROM Account where BillToId='2c92a0fb4a38064e014a3f48f1713ada'"}""",
    )
      -> HTTPResponse(200, accountQueryResponse(withIdentity)),
  )

  def accountQueryResponse(withIdentity: Boolean): String =
    s"""
       |{
       |    "records": [
       |        {${if (withIdentity) """
       |            "IdentityId__c": "10101010","""
      else ""}
       |            "sfContactId__c": "00110000011AABBAAB",
       |            "CrmId": "crmId",
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
