package com.gu.holidaystopprocessor

import com.gu.util.config.Stage.{Code, Prod}
import com.gu.zuora.subscription.Fixtures
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class HolidayCreditProductTest extends AnyFlatSpec with Matchers {

  "forStage" should "give correct credit product for a GW subscription" in {
    val subscription = Fixtures.subscriptionFromJson("GuardianWeeklyWith6For6.json")
    HolidayCreditProduct.forStage(Code).forSubscription(subscription) shouldBe HolidayCreditProduct.Code.GuardianWeekly
    HolidayCreditProduct.forStage(Prod).forSubscription(subscription) shouldBe HolidayCreditProduct.Prod.GuardianWeekly
  }

  it should "give correct credit product for a Tier Three subscription" in {
    val subscription = Fixtures.subscriptionFromJson("TierThreeSubscription.json")
    HolidayCreditProduct.forStage(Code).forSubscription(subscription) shouldBe HolidayCreditProduct.Code.GuardianWeekly
    HolidayCreditProduct.forStage(Prod).forSubscription(subscription) shouldBe HolidayCreditProduct.Prod.GuardianWeekly
  }

  it should "give correct credit product for a Home Delivery subscription" in {
    val subscription = Fixtures.subscriptionFromJson("EchoLegacySubscription.json")
    HolidayCreditProduct.forStage(Code).forSubscription(subscription) shouldBe HolidayCreditProduct.Code.HomeDelivery
    HolidayCreditProduct.forStage(Prod).forSubscription(subscription) shouldBe HolidayCreditProduct.Prod.HomeDelivery
  }

  it should "give correct credit product for an observer only / Voucher subscription" in {
    val subscription = Fixtures.subscriptionFromJson("SundayVoucherSubscription.json")
    val actualCode = HolidayCreditProduct.forStage(Code).forSubscription(subscription)
    actualCode shouldBe HolidayCreditProduct.Code.VoucherObserverOnly
    val actualProd = HolidayCreditProduct.forStage(Prod).forSubscription(subscription)
    actualProd shouldBe HolidayCreditProduct.Prod.VoucherObserverOnly
  }

  it should "give correct credit product for a Digital Voucher subscription" in {
    val subscription = Fixtures.subscriptionFromJson("DigitalVoucherSubscription.json")
    HolidayCreditProduct.forStage(Code).forSubscription(subscription) shouldBe HolidayCreditProduct.Code.DigitalVoucher
    HolidayCreditProduct.forStage(Prod).forSubscription(subscription) shouldBe HolidayCreditProduct.Prod.DigitalVoucher
  }

  it should "throw an exception when subscription has no applicable rate plan" in {
    val subscription = Fixtures.subscriptionFromJson("AlternativeSubscription.json")
    val message = "No holiday credit product available for subscription A-S00051570"

    def actualCode = HolidayCreditProduct.forStage(Code).forSubscription(subscription)
    the[IllegalArgumentException] thrownBy actualCode should have message message
    def actualProd = HolidayCreditProduct.forStage(Prod).forSubscription(subscription)
    the[IllegalArgumentException] thrownBy actualProd should have message message
  }
}
