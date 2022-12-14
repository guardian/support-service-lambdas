package com.gu.sf_contact_merge.getaccounts

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.Types.IdentityId
import com.gu.sf_contact_merge.getaccounts.GetContacts.{AccountId, IdentityAndSFContact}
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.ContactId
import com.gu.util.resthttp.Types.ClientSuccess
import com.gu.zuora.fake.FakeZuoraQuerier
import cats.data.NonEmptyList
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetContactsTest extends AnyFlatSpec with Matchers {

  import GetContactsTest._

  it should "work" in {

    val zuoraQuerier = FakeZuoraQuerier(accountQueryRequest, accountQueryResponse)

    val actual = GetContacts(
      zuoraQuerier,
      NonEmptyList(
        AccountId("acid1"),
        List(AccountId("acid2")),
      ),
    )

    actual should be(
      ClientSuccess(
        Map(
          ContactId("b2id1") -> IdentityAndSFContact(Some(IdentityId("idid1")), SFContactId("sfsf1")),
          ContactId("b2id2") -> IdentityAndSFContact(Some(IdentityId("idid2")), SFContactId("sfsf2")),
        ),
      ),
    )

  }

}

object GetContactsTest {

  val accountQueryRequest =
    """SELECT BillToId, IdentityId__c, sfContactId__c FROM Account WHERE Id = 'acid1' or Id = 'acid2'"""

  val accountQueryResponse =
    """{
      |    "records": [
      |        {
      |            "BillToId": "b2id1",
      |            "Id": "acid1",
      |            "IdentityId__c": "idid1",
      |            "sfContactId__c": "sfsf1"
      |        },
      |        {
      |            "BillToId": "b2id2",
      |            "Id": "acid2",
      |            "IdentityId__c": "idid2",
      |            "sfContactId__c": "sfsf2"
      |        }
      |    ],
      |    "size": 2,
      |    "done": true
      |}""".stripMargin

}
