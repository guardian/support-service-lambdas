package com.gu.newproduct.api.addsubscription.email

import java.time.LocalDate

import com.gu.i18n.Country
import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.zuora.GetContacts._
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{BankAccountName, BankAccountNumberMask, DirectDebit, MandateId, SortCode}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.ActivePaymentMethod
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json

class ETPayloadTest extends FlatSpec with Matchers {

  it should "serialise non direct debit contributions Email to json" in {

    val contributionFields = ContributionFields(
      EmailAddress = "some@email.com",
      created = "createdValue",
      amount = "10.23",
      currency = "£",
      edition = "notSureWhatThisIs",
      name = "Marty McFly",
      product = "monthly-contribution"
    )
    val testPayload: ETPayload = ETPayload(
      To = CTo(
        Address = "some@address.com",
        SubscriberKey = "someKey",
        ContactAttributes = CContactAttributes(
          SubscriberAttributes = contributionFields
        )

      ),
      DataExtensionName = "someDataExtension"
    )

    val expected =
      """
        |{
        |    "To": {
        |        "Address": "some@address.com",
        |        "SubscriberKey": "someKey",
        |        "ContactAttributes": {
        |            "SubscriberAttributes": {
        |                "EmailAddress": "some@email.com",
        |                "created": "createdValue",
        |                "amount": "10.23",
        |                "currency": "£",
        |                "edition": "notSureWhatThisIs",
        |                "name": "Marty McFly",
        |                "product": "monthly-contribution"
        |            }
        |        }
        |    },
        |    "DataExtensionName": "someDataExtension"
        |}
      """.stripMargin
    Json.toJson(testPayload) shouldBe Json.parse(expected)

  }

  it should "serialise  direct debit contributions Email to json" in {

    val contributionFields = ContributionFields(
      EmailAddress = "some@email.com",
      created = "createdValue",
      amount = "10.23",
      currency = "£",
      edition = "notSureWhatThisIs",
      name = "Marty McFly",
      product = "monthly-contribution",
      `account name` = Some("account name value"),
      `account number` = Some("account number value"),
      `sort code` = Some("sort code value"),
      `Mandate ID` = Some("mandateIdValue"),
      `first payment date` = Some("first payment date value"),
      `payment method` = Some("Direct Debit")

    )
    val testPayload: ETPayload = ETPayload(
      To = CTo(
        Address = "some@address.com",
        SubscriberKey = "someKey",
        ContactAttributes = CContactAttributes(
          SubscriberAttributes = contributionFields
        )

      ),
      DataExtensionName = "regular-contribution-thank-you"
    )

    val expected =
      """
        |{
        |    "To": {
        |        "Address": "some@address.com",
        |        "SubscriberKey": "someKey",
        |        "ContactAttributes": {
        |            "SubscriberAttributes": {
        |                "EmailAddress": "some@email.com",
        |                "created": "createdValue",
        |                "amount": "10.23",
        |                "currency": "£",
        |                "edition": "notSureWhatThisIs",
        |                "name": "Marty McFly",
        |                "product": "monthly-contribution",
        |                "account name": "account name value",
        |                "account number": "account number value",
        |                "sort code": "sort code value",
        |                "Mandate ID": "mandateIdValue",
        |                "first payment date": "first payment date value",
        |                "payment method" : "Direct Debit"
        |            }
        |        }
        |    },
        |    "DataExtensionName": "regular-contribution-thank-you"
        |}
      """.stripMargin
    Json.toJson(testPayload) shouldBe Json.parse(expected)

  }

  it should "convert to payload from data without direct debit" in {

    val billTo = Contact(FirstName("Marty"), LastName("McFly"), Some(Email("some@email.com")), Some(Country.UK))
    val soldTo = Contact(FirstName("something"), LastName("else"), Some(Email("else@else.com")), Some(Country.UK))
    val contacts = Contacts(billTo = billTo, soldTo = soldTo)

    val expectedContributionFields = ContributionFields(
      EmailAddress = "some@email.com",
      created = "2018-07-12",
      amount = "10.23",
      currency = "£",
      edition = "GB",
      name = "Marty McFly",
      product = "monthly-contribution",
      `account name` = None,
      `account number` = None,
      `sort code` = None,
      `Mandate ID` = None,
      `first payment date` = None,
      `payment method` = None

    )
    val expectedPayload: ETPayload = ETPayload(
      To = CTo(
        Address = "some@email.com",
        SubscriberKey = "some@email.com",
        ContactAttributes = CContactAttributes(
          SubscriberAttributes = expectedContributionFields
        )

      ),
      DataExtensionName = "regular-contribution-thank-you"
    )

    ETPayload.fromData(1023, LocalDate.of(2018, 7, 12), GBP, None, contacts) shouldBe Some(expectedPayload)

  }

  it should "convert to payload from data with direct debit" in {

    val billTo = Contact(FirstName("Marty"), LastName("McFly"), Some(Email("some@email.com")), Some(Country.UK))
    val soldTo = Contact(FirstName("something"), LastName("else"), Some(Email("else@else.com")), Some(Country.UK))
    val contacts = Contacts(billTo = billTo, soldTo = soldTo)
    val directDebit = DirectDebit(
      ActivePaymentMethod,
      BankAccountName("someName"),
      BankAccountNumberMask("123412414***"),
      SortCode("214578"),
      MandateId("someMandateId")
    )

    val expectedContributionFields = ContributionFields(
      EmailAddress = "some@email.com",
      created = "2018-07-12",
      amount = "10.23",
      currency = "£",
      edition = "GB",
      name = "Marty McFly",
      product = "monthly-contribution",
      `account name` = Some("someName"),
      `account number` = Some("123412414***"),
      `sort code` = Some("21-45-78"),
      `Mandate ID` = Some("someMandateId"),
      `first payment date` = Some("Sunday, 22 July 2018"),
      `payment method` = Some("Direct Debit")

    )
    val expectedPayload: ETPayload = ETPayload(
      To = CTo(
        Address = "some@email.com",
        SubscriberKey = "some@email.com",
        ContactAttributes = CContactAttributes(
          SubscriberAttributes = expectedContributionFields
        )

      ),
      DataExtensionName = "regular-contribution-thank-you"
    )

    ETPayload.fromData(1023, LocalDate.of(2018, 7, 12), GBP, Some(directDebit), contacts) shouldBe Some(expectedPayload)

  }

}
