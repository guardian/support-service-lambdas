package com.gu.sf_contact_merge

import com.gu.effects.TestingRawEffects
import com.gu.effects.TestingRawEffects.{HTTPResponse, POSTRequest}
import com.gu.sf_contact_merge.GetZuoraEmailsForAccounts.ContactId
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

class GetEmailsTest extends FlatSpec with Matchers {

  import GetEmailsTest._

  it should "work" in {

    val getContacts = GetZuoraEmailsForAccounts.GetEmails(ZuoraQuery(ZuoraRestRequestMaker(mock.response, ZuoraRestConfig("http://server", "user", "pass"))))_
    val actual = getContacts(List("2c92c0f8644618e30164652a55986e21", "2c92c0f9624bbc5f016253e5739b0b17").map(ContactId.apply))

    actual.map(_.map(_.map(_.value))) should be(\/-(List(Some("peppa.pig@guardian.co.uk"), None)))

  }

}

object GetEmailsTest {

  val accountQueryRequest =
    """{"queryString":"SELECT WorkEmail FROM Contact WHERE Id = '2c92c0f8644618e30164652a55986e21' or Id = '2c92c0f9624bbc5f016253e5739b0b17'"}"""

  val accountQueryResponse =
    """{
      |    "records": [
      |        {
      |            "WorkEmail": "peppa.pig@guardian.co.uk",
      |            "Id": "2c92c0f8644618e30164652a55986e21"
      |        },
      |        {
      |            "Id": "2c92c0f9624bbc5f016253e5739b0b17"
      |        }
      |    ],
      |    "size": 2,
      |    "done": true
      |}""".stripMargin

  val mock = new TestingRawEffects(postResponses = Map(
    POSTRequest("/action/query", accountQueryRequest) -> HTTPResponse(200, accountQueryResponse)
  ))

}
