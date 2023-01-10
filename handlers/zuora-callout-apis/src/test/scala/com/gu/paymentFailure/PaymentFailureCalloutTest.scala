package com.gu.paymentFailure

import org.scalatest._
import play.api.libs.json.Json
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class PaymentFailureCalloutTest extends AnyFlatSpec with Matchers {

  val expectedBillingDetails = BillingDetails(
    address1 = Some("someBilltoAddress1"),
    address2 = Some("someBilltoAddress2"),
    postCode = Some("somePostalCode"),
    city = Some("someBilltoCity"),
    state = Some("someBilltoState"),
    country = Some("someBilltoCountry"),
  )

  "PaymentFailureCallout" should "deserialise callout with email address correctly" in {
    val calloutJson =
      """{
        |  "lastName": "someLastName",
        |  "creditCardExpirationMonth": "4",
        |  "billToContactPostalCode": "somePostalCode",
        |  "creditCardExpirationYear": "2019",
        |  "billToContactCountry": "someBilltoCountry",
        |  "creditCardType": "Visa",
        |  "title": "Mr",
        |  "accountId": "someAccountId",
        |  "billToContactState": "someBilltoState",
        |  "firstName": "someFirstName",
        |  "paymentId": "somePaymentId",
        |  "sfContactId": "someSfContactId",
        |  "tenantId": "someTenantId",
        |  "billToContactAddress1": "someBilltoAddress1",
        |  "billToContactCity": "someBilltoCity",
        |  "currency": "GBP",
        |  "billToContactAddress2": "someBilltoAddress2",
        |  "paymentMethodType": "CreditCard",
        |  "email": "someEmail@domain.com",
        |  "failureNumber": "1"
        |}
      """.stripMargin

    val expectedCallout = PaymentFailureCallout(
      accountId = "someAccountId",
      email = Some("someEmail@domain.com"),
      failureNumber = 1,
      firstName = "someFirstName",
      lastName = "someLastName",
      paymentMethodType = "CreditCard",
      creditCardType = "Visa",
      creditCardExpirationMonth = "4",
      creditCardExpirationYear = "2019",
      paymentId = "somePaymentId",
      currency = "GBP",
      tenantId = "someTenantId",
      title = Some("Mr"),
      billingDetails = expectedBillingDetails,
      sfContactId = "someSfContactId",
    )

    Json.parse(calloutJson).as[PaymentFailureCallout] shouldBe expectedCallout
  }

  val calloutWithNoEmail = PaymentFailureCallout(
    accountId = "someAccountId",
    email = None,
    failureNumber = 1,
    firstName = "someFirstName",
    lastName = "someLastName",
    paymentMethodType = "CreditCard",
    creditCardType = "Visa",
    creditCardExpirationMonth = "4",
    creditCardExpirationYear = "2019",
    paymentId = "somePaymentId",
    currency = "GBP",
    tenantId = "someTenantId",
    title = Some("Mr"),
    billingDetails = expectedBillingDetails,
    sfContactId = "someSfContactId",
  )

  it should "deserialise callout with no email address correctly" in {
    val calloutWithoutEmailJson =
      """{
        |  "lastName": "someLastName",
        |  "creditCardExpirationMonth": "4",
        |  "billToContactPostalCode": "somePostalCode",
        |  "creditCardExpirationYear": "2019",
        |  "billToContactCountry": "someBilltoCountry",
        |  "creditCardType": "Visa",
        |  "title": "Mr",
        |  "accountId": "someAccountId",
        |  "billToContactState": "someBilltoState",
        |  "firstName": "someFirstName",
        |  "paymentId": "somePaymentId",
        |  "sfContactId": "someSfContactId",
        |  "tenantId": "someTenantId",
        |  "billToContactAddress1": "someBilltoAddress1",
        |  "billToContactCity": "someBilltoCity",
        |  "currency": "GBP",
        |  "billToContactAddress2": "someBilltoAddress2",
        |  "paymentMethodType": "CreditCard",
        |  "failureNumber": "1"
        |}
      """.stripMargin

    val expectedBillingDetails = BillingDetails(
      address1 = Some("someBilltoAddress1"),
      address2 = Some("someBilltoAddress2"),
      postCode = Some("somePostalCode"),
      city = Some("someBilltoCity"),
      state = Some("someBilltoState"),
      country = Some("someBilltoCountry"),
    )

    Json.parse(calloutWithoutEmailJson).as[PaymentFailureCallout] shouldBe calloutWithNoEmail
  }

  it should "deserialise callout with an empty string email address to a callout with no email" in {
    val calloutWithEmptyStringEmail =
      """{
        |  "lastName": "someLastName",
        |  "creditCardExpirationMonth": "4",
        |  "billToContactPostalCode": "somePostalCode",
        |  "creditCardExpirationYear": "2019",
        |  "billToContactCountry": "someBilltoCountry",
        |  "creditCardType": "Visa",
        |  "title": "Mr",
        |  "accountId": "someAccountId",
        |  "billToContactState": "someBilltoState",
        |  "firstName": "someFirstName",
        |  "paymentId": "somePaymentId",
        |  "sfContactId": "someSfContactId",
        |  "tenantId": "someTenantId",
        |  "billToContactAddress1": "someBilltoAddress1",
        |  "billToContactCity": "someBilltoCity",
        |  "currency": "GBP",
        |  "billToContactAddress2": "someBilltoAddress2",
        |  "paymentMethodType": "CreditCard",
        |  "email": "",
        |  "failureNumber": "1"
        |}
      """.stripMargin

    val expectedBillingDetails = BillingDetails(
      address1 = Some("someBilltoAddress1"),
      address2 = Some("someBilltoAddress2"),
      postCode = Some("somePostalCode"),
      city = Some("someBilltoCity"),
      state = Some("someBilltoState"),
      country = Some("someBilltoCountry"),
    )

    Json.parse(calloutWithEmptyStringEmail).as[PaymentFailureCallout] shouldBe calloutWithNoEmail
  }

}
