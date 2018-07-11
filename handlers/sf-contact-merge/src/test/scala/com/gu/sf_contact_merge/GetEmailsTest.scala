package com.gu.sf_contact_merge

import com.gu.effects.TestingRawEffects
import com.gu.effects.TestingRawEffects.{HTTPResponse, POSTRequest}
import com.gu.sf_contact_merge.GetZuoraEmailsForAccounts.ContactId
import com.gu.util.zuora.SafeQueryBuilder.ToNel
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

class GetEmailsTest extends FlatSpec with Matchers {

  import GetEmailsTest._

  it should "work" in {

    val zuoraQuerier = ZuoraQuery(ZuoraRestRequestMaker(mock.response, ZuoraRestConfig("http://server", "user", "pass")))
    val getContacts = GetZuoraEmailsForAccounts.GetEmails(zuoraQuerier)_
    val actual = getContacts(ToNel.literal(
      ContactId("cid1"),
      ContactId("cid2")
    ))

    actual.map(_.map(_.map(_.value))) should be(\/-(List(Some("peppa.pig@guardian.co.uk"), None)))

  }

}

object GetEmailsTest {

  val contactQueryRequest =
    """{"queryString":"SELECT WorkEmail FROM Contact WHERE Id = 'cid1' or Id = 'cid2'"}"""

  val contactQueryResponse =
    """{
      |    "records": [
      |        {
      |            "WorkEmail": "peppa.pig@guardian.co.uk",
      |            "Id": "cid1"
      |        },
      |        {
      |            "Id": "cid2"
      |        }
      |    ],
      |    "size": 2,
      |    "done": true
      |}""".stripMargin

  val mock = new TestingRawEffects(postResponses = Map(
    POSTRequest("/action/query", contactQueryRequest) -> HTTPResponse(200, contactQueryResponse)
  ))

}
