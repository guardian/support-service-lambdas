package com.gu.autoCancel

import org.scalatest._
import play.api.libs.json.Json
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class AutoCancelCalloutTest extends AnyFlatSpec with Matchers {

  "AutoCancelCallout" should "deserialise callout with email address correctly" in {
    val calloutJson =
      """{
        |"accountId" : "someAccountId",
        |"autoPay" : "true",
        |"email" : "someEmail@domain.com",
        |"firstName": "someFirstName",
        |"lastName": "someLastName",
        |"paymentMethodType": "card",
        |"creditCardType": "visa",
        |"creditCardExpirationMonth": "11",
        |"creditCardExpirationYear":"2022",
        |"invoiceId": "someInvoiceId",
        |"currency": "gbp",
        |"sfContactId": "someContactId"
        |}
      """.stripMargin

    val expectedCallout = AutoCancelCallout(
      accountId = "someAccountId",
      autoPay = "true",
      email = Some("someEmail@domain.com"),
      firstName = "someFirstName",
      lastName = "someLastName",
      paymentMethodType = "card",
      creditCardType = "visa",
      creditCardExpirationMonth = "11",
      creditCardExpirationYear = "2022",
      invoiceId = "someInvoiceId",
      currency = "gbp",
      sfContactId = "someContactId",
    )

    Json.parse(calloutJson).as[AutoCancelCallout] shouldBe expectedCallout
  }

  val calloutWithNoEmail = AutoCancelCallout(
    accountId = "someAccountId",
    autoPay = "true",
    email = None,
    firstName = "someFirstName",
    lastName = "someLastName",
    paymentMethodType = "card",
    creditCardType = "visa",
    creditCardExpirationMonth = "11",
    creditCardExpirationYear = "2022",
    invoiceId = "someInvoiceId",
    currency = "gbp",
    sfContactId = "someContactId",
  )

  it should "deserialise callout with no email address correctly" in {
    val noEmailCalloutJson =
      """{
        |"accountId" : "someAccountId",
        |"autoPay" : "true",
        |"firstName": "someFirstName",
        |"lastName": "someLastName",
        |"paymentMethodType": "card",
        |"creditCardType": "visa",
        |"creditCardExpirationMonth": "11",
        |"creditCardExpirationYear":"2022",
        |"invoiceId": "someInvoiceId",
        |"currency": "gbp",
        |"sfContactId": "someContactId"
        |}
      """.stripMargin

    Json.parse(noEmailCalloutJson).as[AutoCancelCallout] shouldBe calloutWithNoEmail
  }

  it should "deserialise callout with empty string email address correctly" in {
    val emptyStringEmailCalloutJson =
      """{
        |"accountId" : "someAccountId",
        |"autoPay" : "true",
        |"email" : "",
        |"firstName": "someFirstName",
        |"lastName": "someLastName",
        |"paymentMethodType": "card",
        |"creditCardType": "visa",
        |"creditCardExpirationMonth": "11",
        |"creditCardExpirationYear":"2022",
        |"invoiceId": "someInvoiceId",
        |"currency": "gbp",
        |"sfContactId": "someContactId"
        |}
      """.stripMargin

    Json.parse(emptyStringEmailCalloutJson).as[AutoCancelCallout] shouldBe calloutWithNoEmail
  }

}
