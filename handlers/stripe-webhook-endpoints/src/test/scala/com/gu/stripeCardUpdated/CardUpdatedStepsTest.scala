package com.gu.stripeCardUpdated

import com.gu.effects.TestingRawEffects
import com.gu.effects.TestingRawEffects.{BasicRequest, HTTPResponse}
import com.gu.stripeCardUpdated.CardUpdatedSteps.CardUpdatedUrlParams
import com.gu.stripeCardUpdated.CardUpdatedStepsTestData.{accountSummaryJson, defaultAccountSummaryJson}
import com.gu.stripeCardUpdated.{EventDataObject, CardUpdatedSteps, StripeAccount, StripeBrand, StripeCountry, StripeCustomerId, StripeExpiry, StripeLast4, StripeSourceId}
import com.gu.stripeCardUpdated.zuora.ZuoraQueryPaymentMethod.PaymentMethodFields
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.zuora.ZuoraGetAccountSummary.ZuoraAccount.{AccountId, NumConsecutiveFailures, PaymentMethodId}
import play.api.libs.json.{JsSuccess, Json}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class CardUpdatedStepsGetPaymentMethodsToUpdateTest extends AnyFlatSpec with Matchers {

  "CardUpdatedSteps" should "getAccountToUpdate non default pm" in {
    val effects = new TestingRawEffects(500, Map(
      ("/action/query", HTTPResponse(
        200,
        """{
          |  "records": [
          |    {
          |      "Id": "nondefaultPMID",
          |      "AccountId": "accid",
          |      "NumConsecutiveFailures": 3
          |    }
          |  ],
          |  "size": 1,
          |  "done": true
          |}""".stripMargin
      )), //defaultPMID
      ("/accounts/accid/summary", HTTPResponse(200, defaultAccountSummaryJson))
    ))

    val actual = CardUpdatedSteps.getPaymentMethodsToUpdate(TestData.zuoraDeps(effects))(StripeCustomerId("fakecustid"), StripeSourceId("fakecardid"))

    val expectedPOST = BasicRequest(
      "POST",
      "/action/query",
      "{\"queryString\":\"SELECT Id, AccountId, NumConsecutiveFailures FROM PaymentMethod where Type='CreditCardReferenceTransaction' AND PaymentMethodStatus = 'Active' AND TokenId = 'fakecardid' AND SecondTokenId = 'fakecustid'\"}"
    )
    val expectedGET = BasicRequest(
      "GET",
      "/accounts/accid/summary",
      ""
    )

    effects.requestsAttempted should be(List(expectedGET, expectedPOST))
    actual.toDisjunction should be(Right(List()))
  }

  it should "getAccountToUpdate default pm" in {
    val effects = new TestingRawEffects(500, Map(
      ("/action/query", HTTPResponse(
        200,
        """{
          |  "records": [
          |    {
          |      "Id": "defaultPMID",
          |      "AccountId": "accid",
          |      "NumConsecutiveFailures": 3
          |    }
          |  ],
          |  "size": 1,
          |  "done": true
          |}""".stripMargin
      )), //defaultPMID
      ("/accounts/accid/summary", HTTPResponse(200, defaultAccountSummaryJson))
    ))

    val actual = CardUpdatedSteps.getPaymentMethodsToUpdate(TestData.zuoraDeps(effects))(StripeCustomerId("fakecustid"), StripeSourceId("fakecardid"))

    val expectedPOST = BasicRequest(
      "POST",
      "/action/query",
      "{\"queryString\":\"SELECT Id, AccountId, NumConsecutiveFailures FROM PaymentMethod where Type='CreditCardReferenceTransaction' AND PaymentMethodStatus = 'Active' AND TokenId = 'fakecardid' AND SecondTokenId = 'fakecustid'\"}"
    )
    val expectedGET = BasicRequest(
      "GET",
      "/accounts/accid/summary",
      ""
    )

    effects.requestsAttempted should be(List(expectedGET, expectedPOST))
    actual.toDisjunction should be(Right(List(PaymentMethodFields(PaymentMethodId("defaultPMID"), AccountId("accid"), NumConsecutiveFailures(3)))))
  }

  it should "getAccountToUpdate default pm with multiple on the same account" in {
    val effects = new TestingRawEffects(500, Map(
      ("/action/query", HTTPResponse(
        200,
        """{
          |  "records": [
          |    {
          |      "Id": "defaultPMID",
          |      "AccountId": "accountidfake",
          |      "NumConsecutiveFailures": 2
          |    },
          |    {
          |      "Id": "anotherPM",
          |      "AccountId": "accountidfake",
          |      "NumConsecutiveFailures": 4
          |    }
          |  ],
          |  "size": 2,
          |  "done": true
          |}""".stripMargin
      )), //defaultPMID
      ("/accounts/accountidfake/summary", HTTPResponse(200, defaultAccountSummaryJson))
    ))

    val actual = CardUpdatedSteps.getPaymentMethodsToUpdate(TestData.zuoraDeps(effects))(StripeCustomerId("fakecustid"), StripeSourceId("fakecardid"))

    val expectedPOST = BasicRequest(
      "POST",
      "/action/query",
      "{\"queryString\":\"SELECT Id, AccountId, NumConsecutiveFailures FROM PaymentMethod where Type='CreditCardReferenceTransaction' AND PaymentMethodStatus = 'Active' AND TokenId = 'fakecardid' AND SecondTokenId = 'fakecustid'\"}"
    )
    val expectedGET = BasicRequest(
      "GET",
      "/accounts/accountidfake/summary",
      ""
    )

    effects.requestsAttempted should be(List(expectedGET, expectedPOST))
    actual.toDisjunction should be(Right(List(PaymentMethodFields(PaymentMethodId("defaultPMID"), AccountId("accountidfake"), NumConsecutiveFailures(2)))))
  }

  it should "getAccountToUpdate multiple on different account three only" in {
    val effects = new TestingRawEffects(500, Map(
      ("/action/query", HTTPResponse(
        200,
        """{
          |  "records": [
          |    {
          |      "Id": "defaultPMID",
          |      "AccountId": "accountidfake",
          |      "NumConsecutiveFailures": 2
          |    },
          |    {
          |      "Id": "anotherPM",
          |      "AccountId": "accountidANOTHER",
          |      "NumConsecutiveFailures": 4
          |    },
          |    {
          |      "Id": "anotherPMAGAIN",
          |      "AccountId": "accountidANOTHERONE",
          |      "NumConsecutiveFailures": 4
          |    }
          |  ],
          |  "size": 3,
          |  "done": true
          |}""".stripMargin
      )),
      ("/accounts/accountidfake/summary", HTTPResponse(200, defaultAccountSummaryJson)),
      ("/accounts/accountidANOTHER/summary", HTTPResponse(200, accountSummaryJson("anotherPM"))),
      ("/accounts/accountidANOTHERONE/summary", HTTPResponse(200, accountSummaryJson("anotherPMAGAIN")))
    ))

    val actual = CardUpdatedSteps.getPaymentMethodsToUpdate(TestData.zuoraDeps(effects))(StripeCustomerId("fakecustid"), StripeSourceId("fakecardid"))

    val expectedPOST = BasicRequest(
      "POST",
      "/action/query",
      "{\"queryString\":\"SELECT Id, AccountId, NumConsecutiveFailures FROM PaymentMethod where Type='CreditCardReferenceTransaction' AND PaymentMethodStatus = 'Active' AND TokenId = 'fakecardid' AND SecondTokenId = 'fakecustid'\"}"
    )
    val expectedGET1 = BasicRequest(
      "GET",
      "/accounts/accountidfake/summary",
      ""
    )
    val expectedGET2 = BasicRequest(
      "GET",
      "/accounts/accountidANOTHER/summary",
      ""
    )
    val expectedGET3 = BasicRequest(
      "GET",
      "/accounts/accountidANOTHERONE/summary",
      ""
    )
    effects.requestsAttempted.toSet should be(Set(expectedGET1, expectedGET2, expectedGET3, expectedPOST))
    actual.toDisjunction.map(_.toSet) should be(Right(Set(
      PaymentMethodFields(PaymentMethodId("defaultPMID"), AccountId("accountidfake"), NumConsecutiveFailures(2)),
      PaymentMethodFields(PaymentMethodId("anotherPM"), AccountId("accountidANOTHER"), NumConsecutiveFailures(4)),
      PaymentMethodFields(PaymentMethodId("anotherPMAGAIN"), AccountId("accountidANOTHERONE"), NumConsecutiveFailures(4))
    )))
  }

  it should "getAccountToUpdate multiple on different account two of them but only one is default PM" in {
    val effects = new TestingRawEffects(500, Map(
      ("/action/query", HTTPResponse(
        200,
        """{
          |  "records": [
          |    {
          |      "Id": "defaultPMID",
          |      "AccountId": "accountidfake",
          |      "NumConsecutiveFailures": 2
          |    },
          |    {
          |      "Id": "anotherPMThatIsntTheDefaultForThisAccount",
          |      "AccountId": "accountidANOTHER",
          |      "NumConsecutiveFailures": 4
          |    }
          |  ],
          |  "size": 2,
          |  "done": true
          |}""".stripMargin
      )),
      ("/accounts/accountidfake/summary", HTTPResponse(200, defaultAccountSummaryJson)),
      ("/accounts/accountidANOTHER/summary", HTTPResponse(200, accountSummaryJson("anotherPM")))
    ))

    val actual = CardUpdatedSteps.getPaymentMethodsToUpdate(TestData.zuoraDeps(effects))(StripeCustomerId("fakecustid"), StripeSourceId("fakecardid"))

    val expectedPOST = BasicRequest(
      "POST",
      "/action/query",
      "{\"queryString\":\"SELECT Id, AccountId, NumConsecutiveFailures FROM PaymentMethod where Type='CreditCardReferenceTransaction' AND PaymentMethodStatus = 'Active' AND TokenId = 'fakecardid' AND SecondTokenId = 'fakecustid'\"}"
    )
    val expectedGET1 = BasicRequest(
      "GET",
      "/accounts/accountidfake/summary",
      ""
    )
    val expectedGET2 = BasicRequest(
      "GET",
      "/accounts/accountidANOTHER/summary",
      ""
    )
    effects.requestsAttempted.toSet should be(Set(expectedGET1, expectedGET2, expectedPOST))
    actual.toDisjunction.map(_.toSet) should be(Right(Set(
      PaymentMethodFields(PaymentMethodId("defaultPMID"), AccountId("accountidfake"), NumConsecutiveFailures(2))
    )))
  }

  it should "getAccountToUpdate multiple on different account more than three" in {
    val effects = new TestingRawEffects(500, Map(
      ("/action/query", HTTPResponse(
        200,
        """{
          |  "records": [
          |    {
          |      "Id": "defaultPMID",
          |      "AccountId": "accountidfake",
          |      "NumConsecutiveFailures": 2
          |    },
          |    {
          |      "Id": "anotherPM",
          |      "AccountId": "accountidANOTHER",
          |      "NumConsecutiveFailures": 4
          |    },
          |    {
          |      "Id": "anotherPMAGAIN",
          |      "AccountId": "accountidANOTHERONE",
          |      "NumConsecutiveFailures": 4
          |    },
          |    {
          |      "Id": "anotherPMAGAINAGAIN",
          |      "AccountId": "accountidANOTHERONEANOTHER",
          |      "NumConsecutiveFailures": 4
          |    }
          |  ],
          |  "size": 4,
          |  "done": true
          |}""".stripMargin
      )), //defaultPMID
      ("/accounts/accountidfake/summary", HTTPResponse(200, defaultAccountSummaryJson))
    ))

    val actual = CardUpdatedSteps.getPaymentMethodsToUpdate(TestData.zuoraDeps(effects))(StripeCustomerId("fakecustid"), StripeSourceId("fakecardid"))

    val expectedPOST = BasicRequest(
      "POST",
      "/action/query",
      "{\"queryString\":\"SELECT Id, AccountId, NumConsecutiveFailures FROM PaymentMethod where Type='CreditCardReferenceTransaction' AND PaymentMethodStatus = 'Active' AND TokenId = 'fakecardid' AND SecondTokenId = 'fakecustid'\"}"
    )
    effects.requestsAttempted should be(List(expectedPOST))
    actual.toDisjunction should be(Left(ApiGatewayResponse.internalServerError("could not find correct account for stripe details")))
  }

  it should "getAccountToUpdate no payment methods at all" in {
    val effects = new TestingRawEffects(500, Map(
      ("/action/query", HTTPResponse(
        200,
        """{
          |  "records": [
          |  ],
          |  "size": 0,
          |  "done": true
          |}""".stripMargin
      )), //defaultPMID
      ("/accounts/accountidfake/summary", HTTPResponse(200, defaultAccountSummaryJson))
    ))

    val actual = CardUpdatedSteps.getPaymentMethodsToUpdate(TestData.zuoraDeps(effects))(StripeCustomerId("fakecustid"), StripeSourceId("fakecardid"))

    val expectedPOST = BasicRequest(
      "POST",
      "/action/query",
      "{\"queryString\":\"SELECT Id, AccountId, NumConsecutiveFailures FROM PaymentMethod where Type='CreditCardReferenceTransaction' AND PaymentMethodStatus = 'Active' AND TokenId = 'fakecardid' AND SecondTokenId = 'fakecustid'\"}"
    )
    effects.requestsAttempted should be(List(expectedPOST))
    actual.toDisjunction should be(Right(List()))
  }

}

class CardUpdatedStepsUpdatePaymentMethodTest extends AnyFlatSpec with Matchers {

  "CardUpdatedSteps" should "updatePaymentMethod" in {

    val effects = new TestingRawEffects(500, Map(
      ("/object/payment-method", HTTPResponse(200, """{"Success": true,"Id": "newPMID"}""")),
      ("/object/account/fake", HTTPResponse(200, """{"Success": true,"Id": "fakeaccountid"}"""))
    ))

    val eventData = EventDataObject(
      id = StripeSourceId("card_def456"),
      brand = StripeBrand.Visa,
      country = StripeCountry("US"),
      customer = StripeCustomerId("cus_ghi789"),
      expiry = StripeExpiry(exp_month = 7, exp_year = 2020),
      last4 = StripeLast4("1234")
    )

    val actual = CardUpdatedSteps.createUpdatedDefaultPaymentMethod(
      TestData.zuoraDeps(effects)
    )(
        PaymentMethodFields(PaymentMethodId("PMID"), AccountId("fake"), NumConsecutiveFailures(1)),
        eventData
      )

    val expectedPOST = BasicRequest(
      "POST",
      "/object/payment-method",
      """{"AccountId":"fake","TokenId":"card_def456","SecondTokenId":"cus_ghi789","CreditCardCountry":"US","CreditCardNumber":"1234","CreditCardExpirationMonth":7,"CreditCardExpirationYear":2020,"CreditCardType":"Visa","Type":"CreditCardReferenceTransaction","NumConsecutiveFailures":1}"""
    )
    val expectedPUT = BasicRequest(
      "PUT",
      "/object/account/fake",
      """{"DefaultPaymentMethodId":"newPMID"}"""
    )

    effects.requestsAttempted should be(List(expectedPUT, expectedPOST))
    actual.toDisjunction should be(Right(()))
  }

}

class CardUpdatedStepsApplyTest extends AnyFlatSpec with Matchers {

  "CardUpdatedSteps" should "fail with unauthorised if the Stripe Signature header check fails" in {
    val effects = new TestingRawEffects(500)
    val cardUpdatedSteps = CardUpdatedSteps(TestData.zuoraDeps(effects), TestData.stripeDeps)

    val badHeaders = Map(
      "SomeHeader1" -> "testvalue",
      "Content-Type" -> "application/json",
      "Stripe-Signature" -> "t=1513759648,v1=longAlphanumericString"
    )

    val body =
      """
        |{
        |  "id": "evt_lettersAndNumbers",
        |  "data": {
        |    "object": {
        |      "id": "card_lettersAndNumbers",
        |      "object": "card",
        |      "brand": "Visa",
        |      "country": "US",
        |      "customer": "cus_lettersAndNumbers",
        |      "exp_month": 7,
        |      "exp_year": 2020,
        |      "fingerprint": "lettersAndNumbers",
        |      "funding": "credit",
        |      "last4": "1234",
        |      "name": null,
        |      "tokenization_method": null
        |    }
        |  },
        |  "livemode": true,
        |  "pending_webhooks": 1,
        |  "request": {
        |    "id": null,
        |    "idempotency_key": null
        |  },
        |  "type": "customer.source.updated"
        |}
      """.stripMargin

    val testGatewayRequest = ApiGatewayRequest(None, None, Some(body.toString), Some(badHeaders), None, None)

    val actual = cardUpdatedSteps.steps(testGatewayRequest)

    effects.requestsAttempted should be(Nil)
    actual.statusCode should be("401")
  }

  it should "manage without the stripe param in Url" in {
    val queryStringJson = """{"apiToken": "a", "apiClientId": "b"}"""
    Json.parse(queryStringJson).validate[CardUpdatedUrlParams] should be(JsSuccess(CardUpdatedUrlParams(None)))

  }

  it should "manage without a valid stripe param in Url" in {
    val queryStringJson = """{"apiToken": "a", "apiClientId": "b", "stripeAccount": "invalidValue"}"""

    Json.parse(queryStringJson).as[CardUpdatedUrlParams] should be(CardUpdatedUrlParams(None))

  }

  it should "manage with the GMN AUS stripe param set" in {
    val queryStringJson = """{"apiToken": "a", "apiClientId": "b", "stripeAccount": "GNM_Membership_AUS"}"""
    Json.parse(queryStringJson).as[CardUpdatedUrlParams] should be(CardUpdatedUrlParams(Some(StripeAccount.GNM_Membership_AUS)))
  }

  it should "manage with the GMN stripe param set" in {
    val queryStringJson = """{"apiToken": "a", "apiClientId": "b", "stripeAccount": "GNM_Membership"}"""
    Json.parse(queryStringJson).as[CardUpdatedUrlParams] should be(CardUpdatedUrlParams(Some(StripeAccount.GNM_Membership)))
  }

}

object CardUpdatedStepsTestData {

  val defaultAccountSummaryJson: String = accountSummaryJson("defaultPMID")
  def accountSummaryJson(pmID: String): String =
    s"""{
  "payments": [
    {
      "paidInvoices": [
        {
          "invoiceNumber": "INV00000159",
          "appliedPaymentAmount": 5,
          "invoiceId": "2c92a09539190dbe0139190f42780012"
        },
        {
          "invoiceNumber": "INV00000323",
          "appliedPaymentAmount": 139722.1,
          "invoiceId": "2c92a0953a3fa95d013a407c10a60100"
        },
        {
          "invoiceNumber": "INV00000160",
          "appliedPaymentAmount": 10521,
          "invoiceId": "2c92a09739190dc60139194bcf1b0098"
        }
      ],
      "paymentNumber": "P-00000075",
      "status": "Processed",
      "effectiveDate": "2013-03-27",
      "id": "2c92c8f83dabf9cf013daf3bfa0305a6",
      "paymentType": "Electronic"
    },
    {
      "paidInvoices": [
        {
          "invoiceNumber": "INV00000159",
          "appliedPaymentAmount": 5,
          "invoiceId": "2c92a09539190dbe0139190f42780012"
        }
      ],
      "paymentNumber": "P-00000056",
      "status": "Processed",
      "effectiveDate": "2012-08-11",
      "id": "2c92a0f9391832b101391922ad5f049d",
      "paymentType": "Electronic"
    }
  ],
  "invoices": [
    {
      "amount": 139722.1,
      "status": "Posted",
      "invoiceNumber": "INV00000323",
      "invoiceDate": "2013-02-11",
      "balance": 0,
      "id": "2c92a0953a3fa95d013a407c10a60100",
      "dueDate": "2013-02-11"
    },
    {
      "amount": 10521,
      "status": "Posted",
      "invoiceNumber": "INV00000160",
      "invoiceDate": "2012-08-11",
      "balance": 0,
      "id": "2c92a09739190dc60139194bcf1b0098",
      "dueDate": "2012-08-11"
    },
    {
      "amount": 10,
      "status": "Posted",
      "invoiceNumber": "INV00000159",
      "invoiceDate": "2012-08-11",
      "balance": 0,
      "id": "2c92a09539190dbe0139190f42780012",
      "dueDate": "2012-08-11"
    }
  ],
  "usage": [
    {
      "unitOfMeasure": "UOM",
      "quantity": 10,
      "startDate": "2012-02"
    },
    {
      "unitOfMeasure": "UOM",
      "quantity": 10,
      "startDate": "2012-01"
    }
  ],
  "basicInfo": {
    "defaultPaymentMethod": {
      "creditCardNumber": "************1111",
      "paymentMethodType": "CreditCard",
      "creditCardExpirationMonth": 10,
      "creditCardExpirationYear": 2020,
      "creditCardType": "Visa",
      "id": "$pmID"
    },
    "status": "Active",
    "lastInvoiceDate": "2013-02-11",
    "lastPaymentAmount": 150248.1,
    "billCycleDay": 1,
    "invoiceDeliveryPrefsPrint": false,
    "invoiceDeliveryPrefsEmail": true,
    "additionalEmailAddresses": [
      "test1@test.com",
      "test2@test.com"
    ],
    "name": "subscribeCallYan_1",
    "balance": 0,
    "accountNumber": "A00001115",
    "id": "accountidfake",
    "dfadsf__c": null,
    "currency": "USD",
    "lastPaymentDate": "2013-03-27"
  },
  "soldToContact": {
    "fax": "",
    "taxRegion": "",
    "country": "United States",
    "zipCode": "95135",
    "county": "",
    "lastName": "Cho",
    "workEmail": "work_email@zbcloud.com",
    "state": "California",
    "address2": "",
    "address1": "278 Bridgeton Circle",
    "firstName": "Bill",
    "id": "2c92a0f9391832b10139183e27940043",
    "workPhone": "5555551212",
    "city": "San Jose"
  },
  "success": true,
  "subscriptions": [
    {
      "termEndDate": "2014-02-01",
      "termStartDate": "2013-02-01",
      "status": "Active",
      "initialTerm": 12,
      "autoRenew": true,
      "subscriptionNumber": "A-S00001081",
      "subscriptionStartDate": "2013-02-01",
      "id": "2c92c8f83dc4f752013dc72c24ee016d",
      "ratePlans": [
        {
          "productName": "Recurring Charge",
          "ratePlanName": "QSF_Tier"
        }
      ],
      "termType": "TERMED",
      "renewalTerm": 3
    },
    {
      "termEndDate": "2014-02-01",
      "termStartDate": "2013-02-01",
      "status": "Active",
      "initialTerm": 12,
      "autoRenew": true,
      "subscriptionNumber": "A-S00001080",
      "subscriptionStartDate": "2013-02-01",
      "id": "2c92c8f83dc4f752013dc72bb85c0127",
      "ratePlans": [
        {
          "productName": "Recurring Charge",
          "ratePlanName": "QSF_Tier"
        }
      ],
      "termType": "TERMED",
      "renewalTerm": 3
    },
    {
      "termEndDate": "2014-04-01",
      "termStartDate": "2013-12-01",
      "status": "Cancelled",
      "initialTerm": 10,
      "autoRenew": false,
      "subscriptionNumber": "A-S00001079",
      "subscriptionStartDate": "2013-02-01",
      "id": "2c92c8f83dc4f752013dc723fdab00d4",
      "ratePlans": [
        {
          "productName": "Recurring Charge",
          "ratePlanName": "QSF_Tier"
        }
      ],
      "termType": "TERMED",
      "renewalTerm": 4
    },
    {
      "termEndDate": "2012-02-11",
      "termStartDate": "2011-02-11",
      "status": "Active",
      "initialTerm": 12,
      "autoRenew": false,
      "subscriptionNumber": "A-S00001076",
      "subscriptionStartDate": "2011-02-11",
      "id": "2c92c8f83db0b4b4013db4717ad000ec",
      "ratePlans": [
        {
          "productName": "Recurring Charge",
          "ratePlanName": "Month_PerUnit"
        },
        {
          "productName": "Recurring Charge",
          "ratePlanName": "Month_PerUnit"
        }
      ],
      "termType": "TERMED",
      "renewalTerm": 3
    },
    {
      "termEndDate": "2012-02-11",
      "termStartDate": "2011-02-11",
      "status": "Active",
      "initialTerm": 12,
      "autoRenew": false,
      "subscriptionNumber": "A-S00001075",
      "subscriptionStartDate": "2011-02-11",
      "id": "2c92c8f83db0b4b4013db3ab6a4d00bc",
      "ratePlans": [
        {
          "productName": "Recurring Charge",
          "ratePlanName": "Month_PerUnit"
        },
        {
          "productName": "Recurring Charge",
          "ratePlanName": "Month_PerUnit"
        }
      ],
      "termType": "TERMED",
      "renewalTerm": 3
    },
    {
      "termEndDate": "2012-02-11",
      "termStartDate": "2011-02-11",
      "status": "Active",
      "initialTerm": 12,
      "autoRenew": false,
      "subscriptionNumber": "A-S00001074",
      "subscriptionStartDate": "2011-02-11",
      "id": "2c92c8f83db0b4b4013db3aa9fbd0090",
      "ratePlans": [
        {
          "productName": "Recurring Charge",
          "ratePlanName": "Month_PerUnit"
        }
      ],
      "termType": "TERMED",
      "renewalTerm": 3
    }
  ],
  "billToContact": {
    "fax": "",
    "taxRegion": "",
    "country": "United States",
    "zipCode": "95135",
    "county": "",
    "lastName": "Zou",
    "workEmail": "work_email@zbcloud.com",
    "state": "California",
    "address2": "",
    "address1": "1400 Bridge Pkwy",
    "firstName": "Cheng",
    "id": "2c92a0f9391832b10139183e27940043",
    "workPhone": "5555551212",
    "city": "San Jose"
  }
}""".stripMargin

}
