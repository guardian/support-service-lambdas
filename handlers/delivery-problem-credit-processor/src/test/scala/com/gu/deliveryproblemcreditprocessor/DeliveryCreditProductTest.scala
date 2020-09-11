package com.gu.deliveryproblemcreditprocessor

import com.gu.util.config.Stage.Dev
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class DeliveryCreditProductTest extends AnyFlatSpec with Matchers {

  "forStage" should "give correct credit product for a GW subscription" in {
    val subscription = Fixtures.subscriptionFromJson("GuardianWeeklyWith6For6.json")
    DeliveryCreditProduct.forStage(Dev)(subscription) shouldBe DeliveryCreditProduct.Dev.GuardianWeekly
  }

  it should "give correct credit product for a Home Delivery subscription" in {
    val subscription = Fixtures.subscriptionFromJson("EchoLegacySubscription.json")
    DeliveryCreditProduct.forStage(Dev)(subscription) shouldBe DeliveryCreditProduct.Dev.HomeDelivery
  }

  it should "throw an exception when subscription has no applicable rate plan" in {
    val subscription = Fixtures.subscriptionFromJson("AlternativeSubscription.json")
    the[IllegalArgumentException] thrownBy DeliveryCreditProduct.forStage(Dev)(subscription) should have message "No delivery credit product available for subscription A-S00051570"
  }
}
