package com.gu.sf_contact_merge.update

import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.{CRMAccountId, SFPointer}
import com.gu.sf_contact_merge.validate.GetContacts.{AccountId, IdentityId, SFContactId}
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
      SFPointer(
        SFContactId("johnjohn_c"),
        CRMAccountId("crmIdjohn"),
        None
      )
    )(
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
        |    "IdentityId__c": "identity"
        |    }
      """.stripMargin
    )

    val actual = UpdateAccountSFLinks.toRequest(
      SFPointer(
        SFContactId("johnjohn_c"),
        CRMAccountId("crmIdjohn"),
        Some(IdentityId("identity"))
      )
    )(
        AccountId("1234")
      )

    actual should be(PutRequest(expectedInput, RelativePath(expectedUrl)))

  }

}

