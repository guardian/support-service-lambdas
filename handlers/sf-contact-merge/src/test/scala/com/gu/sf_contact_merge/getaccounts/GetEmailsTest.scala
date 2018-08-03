package com.gu.sf_contact_merge.getaccounts

import com.gu.sf_contact_merge.getaccounts.GetEmails.{ContactId, EmailAddress}
import com.gu.util.resthttp.Types.ClientSuccess
import com.gu.zuora.fake.FakeZuoraQuerier
import org.scalatest.{FlatSpec, Matchers}
import scalaz.NonEmptyList

class GetEmailsTest extends FlatSpec with Matchers {

  import GetEmailsTest._

  it should "handle an email and a missing email with a fake querier" in {

    val expectedQuery = """SELECT Id, WorkEmail FROM Contact WHERE Id = 'cid1' or Id = 'cid2'"""

    val querier = FakeZuoraQuerier(expectedQuery, contactQueryResponse)
    val getContacts = GetEmails(querier)_
    val actual = getContacts(NonEmptyList(
      ContactId("cid1"),
      ContactId("cid2")
    ))

    val expectedEmails = Map(ContactId("cid1") -> Some(EmailAddress("peppa.pig@guardian.co.uk")), ContactId("cid2") -> None)
    actual should be(ClientSuccess(expectedEmails))

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
