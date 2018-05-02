package com.gu.identityBackfill.salesforce.updateSFIdentityId

import com.gu.effects.TestingRawEffects
import com.gu.effects.TestingRawEffects.{HTTPResponse, POSTRequest}
import com.gu.identityBackfill.Types.{IdentityId, SFContactId}
import com.gu.identityBackfill.salesforce.SalesforceAuthenticate.SalesforceAuth
import com.gu.identityBackfill.salesforce.{SalesforceRestRequestMaker, UpdateSalesforceIdentityId}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

class UpdateSalesforceIdentityIdTest extends FlatSpec with Matchers {

  it should "send the right request for update identity id" in {
    val effects = new TestingRawEffects(postResponses = UpdateSalesforceIdentityIdData.postResponses)
    val auth = UpdateSalesforceIdentityId(SalesforceRestRequestMaker(
      SalesforceAuth("accesstokentoken", "https://urlsf.hi"),
      effects.response
    )) _
    val actual = auth(SFContactId("contactsf"), IdentityId("identityid"))
    val expected = \/-(())
    actual should be(expected)

  }

}

object UpdateSalesforceIdentityIdData {

  def postResponses: Map[POSTRequest, HTTPResponse] = {

    Map(
      POSTRequest(
        "/services/data/v20.0/sobjects/Contact/contactsf",
        """{"IdentityID__c":"identityid"}""",
        "PATCH"
      )
        -> HTTPResponse(204, "")
    )
  }

}
