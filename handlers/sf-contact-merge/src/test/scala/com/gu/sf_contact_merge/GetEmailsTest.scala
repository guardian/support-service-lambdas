package com.gu.sf_contact_merge

import com.gu.sf_contact_merge.GetZuoraEmailsForAccounts.ContactId
import com.gu.util.zuora.RestRequestMaker.ClientSuccess
import com.gu.zuora.fake.FakeZuoraQuerier
import org.scalatest.{FlatSpec, Matchers}
import scalaz.NonEmptyList

class GetEmailsTest extends FlatSpec with Matchers {

  import GetEmailsTest._

  it should "handle an email and a missing email with a fake querier" in {

    val expectedQuery = """SELECT WorkEmail FROM Contact WHERE Id = 'cid1' or Id = 'cid2'"""

    val querier = FakeZuoraQuerier(expectedQuery, contactQueryResponse)
    val getContacts = GetZuoraEmailsForAccounts.GetEmails(querier)_
    val actual = getContacts(NonEmptyList(
      ContactId("cid1"),
      ContactId("cid2")
    ))

    val expectedEmails = List(Some("peppa.pig@guardian.co.uk"), None)
    actual.map(_.map(_.map(_.value))) should be(ClientSuccess(expectedEmails))

  }

}

object GetEmailsTest {

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

}
