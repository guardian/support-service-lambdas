package com.gu.sf_contact_merge.update.updateSFIdentityId

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getaccounts.GetEmails.FirstName
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId.{DontChangeFirstName, DummyFirstName, IdentityId, SFContactUpdate, SetFirstName}
import com.gu.util.resthttp.RestRequestMaker.{PatchRequest, RelativePath}
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.{JsObject, JsString}

class UpdateSalesforceIdentityIdTest extends FlatSpec with Matchers {

  it should "send the right request for update identity id" in {

    val actual = UpdateSalesforceIdentityId.toRequest(
      SFContactId("contactsf"),
      SFContactUpdate(Some(IdentityId("identityid")), SetFirstName(FirstName("firstname")))
    )
    val expectedJson = JsObject(Seq(
      "IdentityID__c" -> JsString("identityid"),
      "FirstName" -> JsString("firstname")
    ))
    val expected = new PatchRequest(expectedJson, RelativePath("/services/data/v20.0/sobjects/Contact/contactsf"))
    actual should be(expected)

  }

  it should "when we update with no first name, should set a dot" in {

    val actual = UpdateSalesforceIdentityId.toRequest(
      SFContactId("contactsf"),
      SFContactUpdate(Some(IdentityId("identityid")), DummyFirstName)
    )
    val expectedJson = JsObject(Seq(
      "IdentityID__c" -> JsString("identityid"),
      "FirstName" -> JsString(".")
    ))
    val expected = new PatchRequest(expectedJson, RelativePath("/services/data/v20.0/sobjects/Contact/contactsf"))
    actual should be(expected)

  }

  it should "when we update with out changing first name, shouldn't change" in {

    val actual = UpdateSalesforceIdentityId.toRequest(
      SFContactId("contactsf"),
      SFContactUpdate(Some(IdentityId("identityid")), DontChangeFirstName)
    )
    val expectedJson = JsObject(Seq(
      "IdentityID__c" -> JsString("identityid")
    ))
    val expected = new PatchRequest(expectedJson, RelativePath("/services/data/v20.0/sobjects/Contact/contactsf"))
    actual should be(expected)

  }

  it should "when try to clean the identity id it sets it to blank" in {

    val actual = UpdateSalesforceIdentityId.toRequest(
      SFContactId("contactsf"),
      SFContactUpdate(None, DontChangeFirstName)
    )
    val expectedJson = JsObject(Seq(
      "IdentityID__c" -> JsString("")
    ))
    val expected = new PatchRequest(expectedJson, RelativePath("/services/data/v20.0/sobjects/Contact/contactsf"))
    actual should be(expected)

  }

}
