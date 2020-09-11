package com.gu.holidaystopprocessor

import com.gu.util.config.Stage
import com.gu.zuora.subscription.Fixtures
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class HolidayCreditProductTest extends AnyFlatSpec with Matchers {

  private val Dev = Stage("DEV")
  private val Code = Stage("CODE")

  "forStage" should "give correct credit product for a GW subscription" in {
    val subscription = Fixtures.subscriptionFromJson("GuardianWeeklyWith6For6.json")
    HolidayCreditProduct.forStage(Dev)(subscription) shouldBe HolidayCreditProduct.Dev.GuardianWeekly
    HolidayCreditProduct.forStage(Code)(subscription) shouldBe HolidayCreditProduct.Code.GuardianWeekly
  }

  it should "give correct credit product for a Home Delivery subscription" in {
    val subscription = Fixtures.subscriptionFromJson("EchoLegacySubscription.json")
    HolidayCreditProduct.forStage(Dev)(subscription) shouldBe HolidayCreditProduct.Dev.HomeDelivery
    HolidayCreditProduct.forStage(Code)(subscription) shouldBe HolidayCreditProduct.Code.HomeDelivery
  }

  it should "give correct credit product for a Voucher subscription" in {
    val subscription = Fixtures.subscriptionFromJson("SundayVoucherSubscription.json")
    HolidayCreditProduct.forStage(Dev)(subscription) shouldBe HolidayCreditProduct.Dev.Voucher
    HolidayCreditProduct.forStage(Code)(subscription) shouldBe HolidayCreditProduct.Code.Voucher
  }

  it should "throw an exception when subscription has no applicable rate plan" in {
    val subscription = Fixtures.subscriptionFromJson("AlternativeSubscription.json")
    the[IllegalArgumentException] thrownBy HolidayCreditProduct.forStage(Dev)(subscription) should have message "No holiday credit product available for subscription A-S00051570"
    the[IllegalArgumentException] thrownBy HolidayCreditProduct.forStage(Code)(subscription) should have message "No holiday credit product available for subscription A-S00051570"
  }
}
