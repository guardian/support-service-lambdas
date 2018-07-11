package com.gu.sf_contact_merge

import com.gu.effects.TestingRawEffects
import com.gu.effects.TestingRawEffects.{HTTPResponse, POSTRequest}
import com.gu.sf_contact_merge.GetZuoraEmailsForAccounts.AccountId
import com.gu.util.zuora.SafeQueryBuilder.ToNel
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

class GetContactsTest extends FlatSpec with Matchers {

  import GetContactsTest._

  it should "work" in {

    val zuoraQuerier = ZuoraQuery(ZuoraRestRequestMaker(mock.response, ZuoraRestConfig("http://server", "user", "pass")))
    val getContacts = GetZuoraEmailsForAccounts.GetContacts(zuoraQuerier)_
    val actual = getContacts(ToNel.literal(
      AccountId("acid1"),
      AccountId("acid2")
    ))

    actual.map(_.map(_.value)) should be(\/-(List(
      "b2id1",
      "b2id2"
    )))

  }

}

object GetContactsTest {

  val accountQueryRequest =
    """{"queryString":"SELECT BillToId FROM Account WHERE Id = 'acid1' or Id = 'acid2'"}"""

  val accountQueryResponse =
    """{
      |    "records": [
      |        {
      |            "BillToId": "b2id1",
      |            "Id": "acid1"
      |        },
      |        {
      |            "BillToId": "b2id2",
      |            "Id": "acid2"
      |        }
      |    ],
      |    "size": 2,
      |    "done": true
      |}""".stripMargin

  val mock = new TestingRawEffects(postResponses = Map(
    POSTRequest("/action/query", accountQueryRequest) -> HTTPResponse(200, accountQueryResponse)
  ))

}
