package com.gu.holiday_stops

import org.scalatest.{FlatSpec, Matchers}
import com.gu.holiday_stops.Handler._
import com.gu.salesforce.holiday_stops.SalesforceSFSubscription.SubscriptionForSubscriptionNameAndContact._
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}

class HandlerTest extends FlatSpec with Matchers {

  it should s"convert either the '$HEADER_IDENTITY_ID' header OR '$HEADER_SALESFORCE_CONTACT_ID' header to Contact or fail" in {

    Handler.extractContactFromHeaders(None) shouldBe a[ReturnWithResponse]
    Handler.extractContactFromHeaders(Some(Map())) shouldBe a[ReturnWithResponse]

    val expectedIdentityIdCoreValue = "identity_id"
    Handler.extractContactFromHeaders(Some(Map(
      HEADER_IDENTITY_ID -> expectedIdentityIdCoreValue
    ))) shouldBe ContinueProcessing(Left(IdentityId(expectedIdentityIdCoreValue)))

    val expectedSfContactIdCoreValue = "sf_contact_id"
    Handler.extractContactFromHeaders(Some(Map(
      HEADER_SALESFORCE_CONTACT_ID -> expectedSfContactIdCoreValue
    ))) shouldBe ContinueProcessing(Right(SalesforceContactId(expectedSfContactIdCoreValue)))

  }

}
