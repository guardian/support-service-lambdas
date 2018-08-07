package com.gu.identityBackfill.salesforce.updateSFIdentityId

import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.salesforce.AnyVals.SFContactId
import com.gu.util.resthttp.RestRequestMaker.{PatchRequest, RelativePath}
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.{JsObject, JsString}

class UpdateSalesforceIdentityIdTest extends FlatSpec with Matchers {

  it should "send the right request for update identity id" in {

    val actual = UpdateSalesforceIdentityId.toRequest(SFContactId("contactsf"), Some(IdentityId("identityid")))
    val expected = new PatchRequest(JsObject(Seq("IdentityID__c" -> JsString("identityid"))), RelativePath("/services/data/v20.0/sobjects/Contact/contactsf"))
    actual should be(expected)

  }

}
