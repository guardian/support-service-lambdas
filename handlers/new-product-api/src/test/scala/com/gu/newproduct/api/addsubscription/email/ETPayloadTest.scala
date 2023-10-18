package com.gu.newproduct.api.addsubscription.email

import play.api.libs.json.{Json, OWrites}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class ETPayloadTest extends AnyFlatSpec with Matchers {

  case class TestPayload(data: String)

  object TestPayload {
    implicit val writes: OWrites[TestPayload] = Json.writes[TestPayload]
  }

  it should "serialise payload to json" in {

    val testPayload: ETPayload[TestPayload] = ETPayload(
      To = CTo(
        Address = "some@address.com",
        SubscriberKey = "someKey",
        ContactAttributes = CContactAttributes(
          SubscriberAttributes = TestPayload("hello"),
        ),
      ),
      DataExtensionName = "someDataExtension",
      SfContactId = Some("sfContactId"),
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
        |    "DataExtensionName": "someDataExtension",
        |    "SfContactId" : "sfContactId"
        |}
      """.stripMargin
    Json.toJson(testPayload) shouldBe Json.parse(expected)

  }

}
