package com.gu.sf_contact_merge.getsfcontacts

import com.gu.salesforce.SalesforceConstants.salesforceApiVersion
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.util.resthttp.RestRequestMaker.{GetRequest, RelativePath}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class ToSfContactRequestTest extends AnyFlatSpec with Matchers {

  "toRequest" should "compose a correct GET request" in {
    val actual = ToSfContactRequest(SFContactId("testcont"))
    actual should be(GetRequest(RelativePath(s"/services/data/v$salesforceApiVersion/sobjects/Contact/testcont")))
  }

}
