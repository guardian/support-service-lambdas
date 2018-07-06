package com.gu.sf_contact_merge

import com.gu.effects.TestingRawEffects
import com.gu.effects.TestingRawEffects.{HTTPResponse, POSTRequest}
import com.gu.sf_contact_merge.GetZuoraEmailsForAccounts.AccountId
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

class GetContactsTest extends FlatSpec with Matchers {

  import GetContactsTest._

  it should "work" in {

    val getContacts = GetZuoraEmailsForAccounts.GetContacts(ZuoraQuery(ZuoraRestRequestMaker(mock.response, ZuoraRestConfig("http://server", "user", "pass"))))_
    val actual = getContacts(List("2c92c0f9624bbc5f016253e573970b16", "2c92c0f8644618e30164652a558c6e20").map(AccountId.apply))

    actual.map(_.map(_.value)) should be(\/-(List("2c92c0f8644618e30164652a55986e21", "2c92c0f9624bbc5f016253e5739b0b17")))

  }

}

object GetContactsTest {

  val accountQueryRequest =
    """{"queryString":"SELECT BillToId FROM Account WHERE Id = '2c92c0f9624bbc5f016253e573970b16' or Id = '2c92c0f8644618e30164652a558c6e20'"}"""

  val accountQueryResponse =
    """{
      |    "records": [
      |        {
      |            "BillToId": "2c92c0f8644618e30164652a55986e21",
      |            "Id": "2c92c0f8644618e30164652a558c6e20"
      |        },
      |        {
      |            "BillToId": "2c92c0f9624bbc5f016253e5739b0b17",
      |            "Id": "2c92c0f9624bbc5f016253e573970b16"
      |        }
      |    ],
      |    "size": 2,
      |    "done": true
      |}""".stripMargin

  val mock = new TestingRawEffects(postResponses = Map(
    POSTRequest("/action/query", accountQueryRequest) -> HTTPResponse(200, accountQueryResponse)
  ))

}
