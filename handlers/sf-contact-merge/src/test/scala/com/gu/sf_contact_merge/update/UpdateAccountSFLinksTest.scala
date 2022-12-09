package com.gu.sf_contact_merge.update

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.Types.{IdentityId, WinningSFContact}
import com.gu.sf_contact_merge.getaccounts.GetContacts.AccountId
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.EmailAddress
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.{
  CRMAccountId,
  ClearZuoraIdentityId,
  ReplaceZuoraIdentityId,
  ZuoraFieldUpdates,
}
import com.gu.util.resthttp.RestRequestMaker.{PutRequest, RelativePath}
import play.api.libs.json._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class UpdateAccountSFLinksTest extends AnyFlatSpec with Matchers {

  it should "clear the identity id if the winning account didn't have one" in {

    val expectedUrl = """accounts/1234"""

    val expectedInput = Json.parse(
      """
        |{
        |    "sfContactId__c": "johnjohn_c",
        |    "crmId": "crmIdjohn",
        |    "IdentityId__c": ""
        |    }
      """.stripMargin,
    )

    val actual = UpdateAccountSFLinks.toRequest(
      ZuoraFieldUpdates(
        WinningSFContact(SFContactId("johnjohn_c")),
        CRMAccountId("crmIdjohn"),
        ClearZuoraIdentityId,
        None,
      ),
      AccountId("1234"),
    )

    actual should be(PutRequest(expectedInput, RelativePath(expectedUrl)))

  }

  it should "handle updating an SF account adding identity" in {

    val expectedUrl = """accounts/1234"""

    val expectedInput = Json.parse(
      """
        |{
        |    "sfContactId__c": "johnjohn_c",
        |    "crmId": "crmIdjohn",
        |    "IdentityId__c": "identity",
        |    "billToContact": {"workEmail": "email@email.com"}
        |    }
      """.stripMargin,
    )

    val actual = UpdateAccountSFLinks.toRequest(
      ZuoraFieldUpdates(
        WinningSFContact(SFContactId("johnjohn_c")),
        CRMAccountId("crmIdjohn"),
        ReplaceZuoraIdentityId(IdentityId("identity")),
        Some(EmailAddress("email@email.com")),
      ),
      AccountId("1234"),
    )

    actual should be(PutRequest(expectedInput, RelativePath(expectedUrl)))

  }

}
