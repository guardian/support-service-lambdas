package com.gu.sf_contact_merge.getsfcontacts

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.util.resthttp.RestRequestMaker.{GetRequest, RelativePath}
import org.scalatest.{FlatSpec, Matchers}

class ToSfContactRequestTest extends FlatSpec with Matchers {

  "toRequest" should "compose a correct GET request" in {
    val actual = ToSfContactRequest(SFContactId("testcont"))
    actual should be(GetRequest(RelativePath("/services/data/v43.0/sobjects/Contact/testcont")))
  }

}
