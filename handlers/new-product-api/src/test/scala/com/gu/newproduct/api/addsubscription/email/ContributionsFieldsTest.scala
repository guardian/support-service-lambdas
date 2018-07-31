package com.gu.newproduct.api.addsubscription.email

import java.time.LocalDate

import com.gu.i18n.Country
import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.zuora.GetBillToContact._
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{BankAccountName, BankAccountNumberMask, DirectDebit, MandateId, SortCode}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.ActivePaymentMethod
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json

class ContributionsFieldsTest extends FlatSpec with Matchers {

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

    val expected =
      """
        |{
        | "EmailAddress": "some@email.com",
        | "created": "createdValue",
        | "amount": "10.23",
        | "currency": "£",
        | "edition": "notSureWhatThisIs",
        | "name": "Marty McFly",
        | "product": "monthly-contribution"
        |}
      """.stripMargin
    Json.toJson(contributionFields) shouldBe Json.parse(expected)

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

    val expected =
      """
        |{
        | "EmailAddress": "some@email.com",
        | "created": "createdValue",
        | "amount": "10.23",
        | "currency": "£",
        | "edition": "notSureWhatThisIs",
        | "name": "Marty McFly",
        | "product": "monthly-contribution",
        | "account name": "account name value",
        | "account number": "account number value",
        | "sort code": "sort code value",
        | "Mandate ID": "mandateIdValue",
        | "first payment date": "first payment date value",
        | "payment method" : "Direct Debit"
        |}
      """.stripMargin
    Json.toJson(contributionFields) shouldBe Json.parse(expected)

  }

  it should "convert to contributions fiels from data without direct debit" in {

    val billTo = Contact(FirstName("Marty"), LastName("McFly"), Some(Email("some@email.com")), Some(Country.UK))

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

    val actual = ContributionFields.fromData(1023, LocalDate.of(2018, 7, 12), GBP, None, billTo)
    actual shouldBe Some(expectedContributionFields)

  }

  it should "convert to contribution fields from data with direct debit" in {

    val billTo = Contact(FirstName("Marty"), LastName("McFly"), Some(Email("some@email.com")), Some(Country.UK))
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

    val actual = ContributionFields.fromData(1023, LocalDate.of(2018, 7, 12), GBP, Some(directDebit), billTo)
    actual shouldBe Some(expectedContributionFields)

  }

}
