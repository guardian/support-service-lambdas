package com.gu.cancellation.sf_cases

import com.gu.cancellation.sf_cases.RaiseCase._
import com.gu.salesforce.cases.SalesforceCase.Create.WireNewCase
import com.gu.salesforce.cases.SalesforceCase.{CaseSubject, ContactId}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class HandlerTest extends AnyFlatSpec with Matchers {

  it should "convert the raise case post body, sub id and contact id to a WireNewCase" in {

    val contactId = ContactIdContainer("contactID")
    val product = ProductName("Membership")
    val reason = Reason("mma_editorial")
    val subName = SubscriptionName("A-S12345678")
    val gaData = GaDataJsonString(
      "{\"UA-51507017-5\":{\"experiments\":{\"9ycLuqmFRBGBDGV5bnFlCA\":\"1\"},\"hitcount\":3}}",
    )

    val actual = RaiseCase.buildWireNewCaseForSalesforce(
      RaiseCaseDetail(
        product,
        reason,
        subName,
        gaData,
      ),
      subName,
      contactId,
    )

    val expected = WireNewCase(
      ContactId = ContactId(contactId.Id),
      Product__c = product.value,
      Subscription_Name__c = subName,
      Category__c = "Retentions",
      Self_Serve_Cancel_Reason__c = reason.value,
      Case_Journey__c = "Self Service",
      Status = "Closed",
      Subject = CaseSubject(STARTING_CASE_SUBJECT),
    )

    actual shouldEqual expected

  }

}
