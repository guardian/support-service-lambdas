package com.gu.newproduct.api.addsubscription.email

import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json

class ETPayloadTest extends FlatSpec with Matchers {

  case class TestPayload(data: String)

  object TestPayload {
    implicit val writes = Json.writes[TestPayload]
  }

  it should "serialise payload to json" in {

    val testPayload: ETPayload[TestPayload] = ETPayload(
      To = CTo(
        Address = "some@address.com",
        SubscriberKey = "someKey",
        ContactAttributes = CContactAttributes(
          SubscriberAttributes = TestPayload("hello")
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
        |                "data" : "hello"
        |            }
        |        }
        |    },
        |    "DataExtensionName": "someDataExtension"
        |}
      """.stripMargin
    Json.toJson(testPayload) shouldBe Json.parse(expected)

  }

}
