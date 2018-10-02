package com.gu.sf_contact_merge.update

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.Types.{IdentityId, WinningSFContact}
import com.gu.sf_contact_merge.getaccounts.GetContacts.AccountId
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.EmailAddress
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.{CRMAccountId, ZuoraFieldUpdates}
import com.gu.sf_contact_merge.update.UpdateSFContacts.IdentityIdToUse
import com.gu.util.resthttp.RestRequestMaker.{PutRequest, RelativePath}
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json._

class UpdateAccountSFLinksTest extends FlatSpec with Matchers {

  it should "handle updating an SF account with no identity to add" in {

    val expectedUrl = """accounts/1234"""

    val expectedInput = Json.parse(
      """
        |{
        |    "sfContactId__c": "johnjohn_c",
        |    "crmId": "crmIdjohn"
        |    }
      """.stripMargin
    )

    val actual = UpdateAccountSFLinks.toRequest(
      ZuoraFieldUpdates(
        WinningSFContact(SFContactId("johnjohn_c")),
        CRMAccountId("crmIdjohn"),
        None,
        None
      ),
      AccountId("1234")
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
      """.stripMargin
    )

    val actual = UpdateAccountSFLinks.toRequest(
      ZuoraFieldUpdates(
        WinningSFContact(SFContactId("johnjohn_c")),
        CRMAccountId("crmIdjohn"),
        Some(IdentityIdToUse(IdentityId("identity"))),
        Some(EmailAddress("email@email.com"))
      ),
      AccountId("1234")
    )

    actual should be(PutRequest(expectedInput, RelativePath(expectedUrl)))

  }

}

