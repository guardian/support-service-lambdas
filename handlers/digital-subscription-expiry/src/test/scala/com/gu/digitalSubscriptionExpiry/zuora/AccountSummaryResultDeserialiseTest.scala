package com.gu.digitalSubscriptionExpiry.zuora

import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.{AccountId, AccountSummaryResult}
import org.scalatest.matchers.should.Matchers._
import play.api.libs.json.{JsResult, JsSuccess, Json}
import org.scalatest.matchers
import org.scalatest.flatspec.AnyFlatSpec

class AccountSummaryResultDeserialiseTest extends AnyFlatSpec {

  it should "deserialise correctly Account with null postcode" in {

    val expected: JsResult[AccountSummaryResult] = JsSuccess(
      AccountSummaryResult(
        accountId = AccountId("testId"),
        billToLastName = "billingLastName",
        billToPostcode = None,
        soldToLastName = "soldToLastName",
        soldToPostcode = None,
        identityId = Some("12344"),
      ),
    )

    val testAccount = getTestAccount(None, None, Some("12344"))
    val event: JsResult[AccountSummaryResult] = Json.parse(testAccount).validate[AccountSummaryResult]

    event should be(expected)
  }

  it should "deserialise correctly Account with empty string postcode" in {

    val expected: JsResult[AccountSummaryResult] = JsSuccess(
      AccountSummaryResult(
        accountId = AccountId("testId"),
        billToLastName = "billingLastName",
        billToPostcode = Some(""),
        soldToLastName = "soldToLastName",
        soldToPostcode = Some(""),
        identityId = Some("12344"),
      ),
    )

    val testAccount = getTestAccount(Some(""), Some(""), Some("12344"))
    val event: JsResult[AccountSummaryResult] = Json.parse(testAccount).validate[AccountSummaryResult]

    event should be(expected)
  }

  it should "deserialise correctly Account with postcode" in {

    val expected: JsResult[AccountSummaryResult] = JsSuccess(
      AccountSummaryResult(
        accountId = AccountId("testId"),
        billToLastName = "billingLastName",
        billToPostcode = Some("billtoPostcodeValue"),
        soldToLastName = "soldToLastName",
        soldToPostcode = Some("SoldToPostcodeValue"),
        identityId = Some("12344"),
      ),
    )

    val testAccount = getTestAccount(
      billToPostcode = Some("billtoPostcodeValue"),
      soldToPostcode = Some("SoldToPostcodeValue"),
      identityId = Some("12344"),
    )
    val event: JsResult[AccountSummaryResult] = Json.parse(testAccount).validate[AccountSummaryResult]

    event should be(expected)
  }

  it should "deserialise correctly Account without identityId" in {

    val expected: JsResult[AccountSummaryResult] = JsSuccess(
      AccountSummaryResult(
        accountId = AccountId("testId"),
        billToLastName = "billingLastName",
        billToPostcode = Some("billtoPostcodeValue"),
        soldToLastName = "soldToLastName",
        soldToPostcode = Some("SoldToPostcodeValue"),
        identityId = None,
      ),
    )

    val testAccount = getTestAccount(
      billToPostcode = Some("billtoPostcodeValue"),
      soldToPostcode = Some("SoldToPostcodeValue"),
      identityId = None,
    )
    val event: JsResult[AccountSummaryResult] = Json.parse(testAccount).validate[AccountSummaryResult]

    event should be(expected)
  }

  it should "deserialise correctly Account with identityId" in {

    val expected: JsResult[AccountSummaryResult] = JsSuccess(
      AccountSummaryResult(
        accountId = AccountId("testId"),
        billToLastName = "billingLastName",
        billToPostcode = Some("billtoPostcodeValue"),
        soldToLastName = "soldToLastName",
        soldToPostcode = Some("SoldToPostcodeValue"),
        identityId = Some("12344"),
      ),
    )

    val testAccount = getTestAccount(
      billToPostcode = Some("billtoPostcodeValue"),
      soldToPostcode = Some("SoldToPostcodeValue"),
      identityId = Some("12344"),
    )
    val event: JsResult[AccountSummaryResult] = Json.parse(testAccount).validate[AccountSummaryResult]

    event should be(expected)
  }

  def getTestAccount(
      billToPostcode: Option[String] = None,
      soldToPostcode: Option[String],
      identityId: Option[String],
  ) = {
    def toFieldValue(o: Option[String]) = o.map(s => '"' + s + '"').getOrElse("null")

    s"""
      {
       |    "basicInfo": {
       |        "id": "testId",
       |        "name": "testName",
       |        "accountNumber": "TestAccountNumber",
       |        "notes": null,
       |        "status": "Active",
       |        "crmId": "someID",
       |        "batch": "Batch1",
       |        "invoiceTemplateId": "templateID",
       |        "communicationProfileId": null,
       |        "IdentityId__c": ${toFieldValue(identityId)},
       |        "sfContactId__c": "00xdxE00000NKaRgQAL",
       |        "CCURN__c": null,
       |        "NonStandardDataReason__c": null,
       |        "salesRep": null,
       |        "parentId": null
       |    },
       |    "billingAndPayment": {
       |        "billCycleDay": 16,
       |        "currency": "GBP",
       |        "paymentTerm": "Due Upon Receipt",
       |        "paymentGateway": "Stripe 2",
       |        "invoiceDeliveryPrefsPrint": false,
       |        "invoiceDeliveryPrefsEmail": true,
       |        "additionalEmailAddresses": []
       |    },
       |    "metrics": {
       |        "balance": 0,
       |        "totalInvoiceBalance": 0,
       |        "creditBalance": 0,
       |        "contractedMrr": 29.2
       |    },
       |    "billToContact": {
       |        "address1": "123 fake st",
       |        "address2": "",
       |        "city": "fakeville",
       |        "country": "United Kingdom",
       |        "county": "",
       |        "fax": "",
       |        "firstName": "billingFirstName",
       |        "homePhone": "",
       |        "lastName": "billingLastName",
       |        "mobilePhone": "",
       |        "nickname": "",
       |        "otherPhone": "",
       |        "otherPhoneType": "Work",
       |        "personalEmail": "",
       |        "state": "",
       |        "taxRegion": "",
       |        "workEmail": "test.testerson@gu.com",
       |        "workPhone": "",
       |        "zipCode": ${toFieldValue(billToPostcode)},
       |        "SpecialDeliveryInstructions__c": null,
       |        "Title__c": "Mr"
       |    },
       |    "soldToContact": {
       |        "address1": "123 fake st",
       |        "address2": "",
       |        "city": "fakeville",
       |        "country": "United Kingdom",
       |        "county": "",
       |        "fax": "",
       |        "firstName": "soldToFirstName",
       |        "homePhone": "",
       |        "lastName": "soldToLastName",
       |        "mobilePhone": "",
       |        "nickname": "",
       |        "otherPhone": "",
       |        "otherPhoneType": "Work",
       |        "personalEmail": "",
       |        "state": "",
       |        "taxRegion": "",
       |        "workEmail": "test.testerson@gu.com",
       |        "workPhone": "",
       |        "zipCode": ${toFieldValue(soldToPostcode)},
       |        "SpecialDeliveryInstructions__c": null,
       |        "Title__c": "Mr"
       |    },
       |    "taxInfo": null,
       |    "success": true
       |}
      """.stripMargin
  }
}
