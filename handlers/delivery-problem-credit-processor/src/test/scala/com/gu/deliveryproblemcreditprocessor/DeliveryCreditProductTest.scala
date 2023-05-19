package com.gu.deliveryproblemcreditprocessor

import com.gu.util.config.Stage.{Code, Prod}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class DeliveryCreditProductTest extends AnyFlatSpec with Matchers {

  "forStage" should "give correct credit product for a GW subscription" in {
    val subscription = TestFixtures.subscriptionFromJson("GuardianWeeklyWith6For6.json")
    DeliveryCreditProduct.forStage(Code)(subscription) shouldBe DeliveryCreditProduct.Code.GuardianWeekly
    DeliveryCreditProduct.forStage(Prod)(subscription) shouldBe DeliveryCreditProduct.Prod.GuardianWeekly
  }

  it should "give correct credit product for a Home Delivery subscription" in {
    val subscription = TestFixtures.subscriptionFromJson("EchoLegacySubscription.json")
    DeliveryCreditProduct.forStage(Code)(subscription) shouldBe DeliveryCreditProduct.Code.HomeDelivery
    DeliveryCreditProduct.forStage(Prod)(subscription) shouldBe DeliveryCreditProduct.Prod.HomeDelivery
  }

  it should "throw an exception when subscription has no applicable rate plan" in {
    val subscription = TestFixtures.subscriptionFromJson("AlternativeSubscription.json")
    the[IllegalArgumentException] thrownBy DeliveryCreditProduct.forStage(Code)(
      subscription,
    ) should have message "No delivery credit product available for subscription A-S00051570"
    the[IllegalArgumentException] thrownBy DeliveryCreditProduct.forStage(Prod)(
      subscription,
    ) should have message "No delivery credit product available for subscription A-S00051570"
  }
}
