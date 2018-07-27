package com.gu.newproduct.api.addsubscription.email

import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json

class PayloadTest extends FlatSpec with Matchers {



  it should "serialise contributions Email to json" in {

    val contributionFields = ContributionFields(
      EmailAddress = "some@email.com",
      created = "createdValue",
      amount = "10.23",
      currency = "£",
      edition = "notSureWhatThisIs",
      name = "Marty McFly",
      product = "monthly-contribution"
    )
    val testPayload: Payload = Payload(
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

}
