package com.gu.holidaystopprocessor

import com.gu.util.config.Stage
import com.gu.zuora.subscription.Fixtures
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class HolidayCreditProductTest extends AnyFlatSpec with Matchers {

  private val dev = Stage("DEV")

  "forStage" should "give correct credit product for a GW subscription in Dev stage" in {
    val subscription = Fixtures.subscriptionFromJson("GuardianWeeklyWith6For6.json")
    HolidayCreditProduct.forStage(dev)(subscription) shouldBe HolidayCreditProduct.Dev.GuardianWeekly
  }

  it should "give correct credit product for a Home Delivery subscription in Dev stage" in {
    val subscription = Fixtures.subscriptionFromJson("EchoLegacySubscription.json")
    HolidayCreditProduct.forStage(dev)(subscription) shouldBe HolidayCreditProduct.Dev.HomeDelivery
  }

  it should "give correct credit product for a Home Delivery Plus subscription in Dev stage" in {
    val subscription = Fixtures.subscriptionFromJson("DeliveryEveryDatePlusSubscription.json")
    HolidayCreditProduct.forStage(dev)(subscription) shouldBe HolidayCreditProduct.Dev.HomeDeliveryPlus
  }

  it should "give correct credit product for a Voucher subscription in Dev stage" in {
    val subscription = Fixtures.subscriptionFromJson("SundayVoucherSubscription.json")
    HolidayCreditProduct.forStage(dev)(subscription) shouldBe HolidayCreditProduct.Dev.Voucher
  }

  it should "give correct credit product for a Voucher Plus subscription in Dev stage" in {
    val subscription = Fixtures.subscriptionFromJson("VoucherWeekendPlusSubscription.json")
    HolidayCreditProduct.forStage(dev)(subscription) shouldBe HolidayCreditProduct.Dev.VoucherPlus
  }

  it should "throw an exception when subscription has no applicable rate plan" in {
    val subscription = Fixtures.subscriptionFromJson("AlternativeSubscription.json")
    val thrown = the[IllegalArgumentException] thrownBy HolidayCreditProduct.forStage(dev)(subscription)
    thrown should have message "No holiday credit product available for subscription A-S00051570"
  }
}
