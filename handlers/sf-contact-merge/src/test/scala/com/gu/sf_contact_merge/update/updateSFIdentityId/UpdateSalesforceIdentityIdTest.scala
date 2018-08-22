package com.gu.sf_contact_merge.update.updateSFIdentityId

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getaccounts.GetEmails.FirstName
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId.{IdentityId, SFContactUpdate}
import com.gu.util.resthttp.RestRequestMaker.{PatchRequest, RelativePath}
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.{JsObject, JsString}

class UpdateSalesforceIdentityIdTest extends FlatSpec with Matchers {

  it should "send the right request for update identity id" in {

    val actual = UpdateSalesforceIdentityId.toRequest(
      SFContactId("contactsf"),
      Some(SFContactUpdate(IdentityId("identityid"), FirstName("firstname")))
    )
    val expectedJson = JsObject(Seq(
      "IdentityID__c" -> JsString("identityid"),
      "FirstName" -> JsString("firstname")
    ))
    val expected = new PatchRequest(expectedJson, RelativePath("/services/data/v20.0/sobjects/Contact/contactsf"))
    actual should be(expected)

  }

}
