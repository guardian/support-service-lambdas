package com.gu.newproduct.api.addsubscription

import play.api.libs.json.Json
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class AddSubscriptionResponseTest extends AnyFlatSpec with Matchers {
  it should "serialise successful response" in {
    val success: AddSubscriptionResponse = AddedSubscription(subscriptionNumber = "someNumber")

    val expected =
      """
        |{
        | "subscriptionNumber" : "someNumber"
        |}
      """.stripMargin
    Json.toJson(success) shouldBe Json.parse(expected)
  }
}
