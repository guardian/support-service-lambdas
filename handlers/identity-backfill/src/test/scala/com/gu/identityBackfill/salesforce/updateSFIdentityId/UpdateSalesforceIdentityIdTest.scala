package com.gu.identityBackfill.salesforce.updateSFIdentityId

import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.util.resthttp.RestRequestMaker.{PatchRequest, RelativePath}
import play.api.libs.json.{JsObject, JsString}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class UpdateSalesforceIdentityIdTest extends AnyFlatSpec with Matchers {

  it should "send the right request for update identity id" in {

    val actual = UpdateSalesforceIdentityId.toRequest(SFContactId("contactsf"), IdentityId("identityid"))
    val expectedJson = JsObject(Seq("IdentityID__c" -> JsString("identityid")))
    val expected = new PatchRequest(expectedJson, RelativePath("/services/data/v20.0/sobjects/Contact/contactsf"))
    actual should be(expected)

  }

}
