package com.gu.sf_contact_merge.getaccounts

import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails._
import com.gu.util.resthttp.Types.ClientSuccess
import com.gu.zuora.fake.FakeZuoraQuerier
import org.scalatest.{FlatSpec, Matchers}
import scalaz.NonEmptyList

class GetZuoraContactDetailsTest extends FlatSpec with Matchers {

  import GetZuoraContactDetailsTest._

  it should "handle an email and a missing email with a fake querier" in {

    val expectedQuery =
      """SELECT Id, WorkEmail, FirstName, LastName, Address1, City, State, PostalCode, Country""" +
        """ FROM Contact WHERE Id = 'cid1' or Id = 'cid2'"""

    val querier = FakeZuoraQuerier(expectedQuery, contactQueryResponse)

    val actual = GetZuoraContactDetails(querier)(NonEmptyList(
      ContactId("cid1"),
      ContactId("cid2")
    ))

    val expected = Map(
      ContactId("cid1") -> ZuoraContactDetails(
        Some(EmailAddress("peppa.pig@guardian.co.uk")),
        Some(FirstName("peppa")),
        LastName("pig"),
        Address(
          Some(Address1("Windy Castle")),
          Some(City("Grassy Hills")),
          Some(State("Farmland")),
          Some(PostalCode("N1 9GU")),
          Country("United Kingdom")
        )
      ),
      ContactId("cid2") -> ZuoraContactDetails(
        None,
        None,
        LastName("pig"),
        Address(
          None,
          None,
          None,
          Some(PostalCode("n1 9gu")),
          Country("United Kingdom")
        )
      )
    )
    actual should be(ClientSuccess(expected))

  }

}

object GetZuoraContactDetailsTest {

  val contactQueryResponse =
    """{
      |    "records": [
      |        {
      |            "WorkEmail": "peppa.pig@guardian.co.uk",
      |            "Id": "cid1",
      |            "FirstName": "peppa",
      |            "LastName": "pig",
      |            "State": "Farmland",
      |            "PostalCode": "N1 9GU",
      |            "Country": "United Kingdom",
      |            "City": "Grassy Hills",
      |            "Address1": "Windy Castle"
      |        },
      |        {
      |            "Country": "United Kingdom",
      |            "Id": "cid2",
      |            "FirstName": ".",
      |            "Address1": ",",
      |            "LastName": "pig",
      |            "PostalCode": "n1 9gu"
      |        }
      |    ],
      |    "size": 2,
      |    "done": true
      |}""".stripMargin

}
