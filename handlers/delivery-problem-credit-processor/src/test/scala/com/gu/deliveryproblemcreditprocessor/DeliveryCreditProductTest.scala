package com.gu.deliveryproblemcreditprocessor

import com.gu.util.config.Stage.{Code, Prod}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class DeliveryCreditProductTest extends AnyFlatSpec with Matchers {

  "forStage" should "give correct credit product for a GW subscription" in {
    val subscription = TestFixtures.subscriptionFromJson("GuardianWeeklyWith6For6.json")
    val actualCode = DeliveryCreditProduct.forStage(Code).forSubscription(subscription)
    actualCode shouldBe DeliveryCreditProduct.Code.GuardianWeekly
    val actualProd = DeliveryCreditProduct.forStage(Prod).forSubscription(subscription)
    actualProd shouldBe DeliveryCreditProduct.Prod.GuardianWeekly
  }

  it should "give correct credit product for a Home Delivery subscription" in {
    val subscription = TestFixtures.subscriptionFromJson("EchoLegacySubscription.json")
    DeliveryCreditProduct.forStage(Code).forSubscription(subscription) shouldBe DeliveryCreditProduct.Code.HomeDelivery
    DeliveryCreditProduct.forStage(Prod).forSubscription(subscription) shouldBe DeliveryCreditProduct.Prod.HomeDelivery
  }

  it should "throw an exception when subscription has no applicable rate plan" in {
    val subscription = TestFixtures.subscriptionFromJson("AlternativeSubscription.json")
    val expected = "No delivery credit product available for subscription A-S00051570"

    def actualCode = DeliveryCreditProduct.forStage(Code).forSubscription(subscription)
    the[IllegalArgumentException] thrownBy actualCode should have message expected
    def actualProd = DeliveryCreditProduct.forStage(Prod).forSubscription(subscription)
    the[IllegalArgumentException] thrownBy actualProd should have message expected
  }
}
