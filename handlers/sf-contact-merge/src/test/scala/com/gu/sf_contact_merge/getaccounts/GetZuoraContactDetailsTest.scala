package com.gu.sf_contact_merge.getaccounts

import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.{
  ContactId,
  EmailAddress,
  FirstName,
  LastName,
  ZuoraContactDetails,
}
import com.gu.util.resthttp.Types.ClientSuccess
import com.gu.zuora.fake.FakeZuoraQuerier
import cats.data.NonEmptyList
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetZuoraContactDetailsTest extends AnyFlatSpec with Matchers {

  import GetZuoraContactDetailsTest._

  it should "handle an email and a missing email with a fake querier" in {

    val expectedQuery = """SELECT Id, WorkEmail, FirstName, LastName FROM Contact WHERE Id = 'cid1' or Id = 'cid2'"""

    val querier = FakeZuoraQuerier(expectedQuery, contactQueryResponse)

    val actual = GetZuoraContactDetails(querier)(
      NonEmptyList(
        ContactId("cid1"),
        List(ContactId("cid2")),
      ),
    )

    val expected = Map(
      ContactId("cid1") -> ZuoraContactDetails(
        Some(EmailAddress("peppa.pig@guardian.co.uk")),
        Some(FirstName("peppa")),
        LastName("pig"),
      ),
      ContactId("cid2") -> ZuoraContactDetails(None, None, LastName("pig")),
    )
    actual should be(ClientSuccess(expected))

  }

}

object GetZuoraContactDetailsTest {

  val contactQueryResponse =
    """{
      |    "records": [
      |        {
      |            "WorkEmail": "peppa.pig@GUARDIAN.co.uk",
      |            "Id": "cid1",
      |            "FirstName": "peppa",
      |            "LastName": "pig"
      |        },
      |        {
      |            "Id": "cid2",
      |            "FirstName": ".",
      |            "LastName": "pig"
      |        }
      |    ],
      |    "size": 2,
      |    "done": true
      |}""".stripMargin

}
