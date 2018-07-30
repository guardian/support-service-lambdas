package com.gu.sf_contact_merge.update

import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.{CRMAccountId, SFPointer}
import com.gu.sf_contact_merge.validate.GetContacts.{AccountId, SFContactId}
import com.gu.util.resthttp.Types.ClientSuccess
import com.gu.zuora.fake.FakeRequestsPut
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json._

class UpdateAccountSFLinksTest extends FlatSpec with Matchers {

  it should "handle an email and a missing email with a fake querier" in {

    val expectedUrl = """accounts/1234"""

    val response = JsObject(Map("Success" -> JsBoolean(true)))
    val expectedInput = Json.parse(
      """
        |{
        |    "sfContactId__c": "johnjohn_c",
        |    "crmId": "crmIdjohn"
        |    }
      """.stripMargin
    )

    val (requestsMade, fakePutter) = FakeRequestsPut(expectedUrl, expectedInput, response)
    val operation = UpdateAccountSFLinks(fakePutter)_
    val actual = operation(
      SFPointer(
        SFContactId("johnjohn_c"),
        CRMAccountId("crmIdjohn")
      )
    )(AccountId("1234"))

    actual should be(ClientSuccess(()))
    requestsMade() should be(List(expectedInput))

  }

}

