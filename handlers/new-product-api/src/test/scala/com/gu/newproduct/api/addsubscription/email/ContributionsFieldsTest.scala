package com.gu.newproduct.api.addsubscription.email
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

}
