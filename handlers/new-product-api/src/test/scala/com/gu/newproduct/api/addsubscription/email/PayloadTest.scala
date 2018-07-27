package com.gu.newproduct.api.addsubscription.email

import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json

class PayloadTest extends FlatSpec with Matchers {

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
        |    "DataExtensionName": "someDataExtension"
        |}
      """.stripMargin
    Json.toJson(testPayload) shouldBe Json.parse(expected)

  }
}
