package com.gu.holidaystopprocessor

import com.gu.util.config.Stage.{Code, Prod}
import com.gu.zuora.subscription.Fixtures
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class HolidayCreditProductTest extends AnyFlatSpec with Matchers {

  "forStage" should "give correct credit product for a GW subscription" in {
    val subscription = Fixtures.subscriptionFromJson("GuardianWeeklyWith6For6.json")
    HolidayCreditProduct.forStage(Code)(subscription) shouldBe HolidayCreditProduct.Code.GuardianWeekly
    HolidayCreditProduct.forStage(Prod)(subscription) shouldBe HolidayCreditProduct.Prod.GuardianWeekly
  }

  it should "give correct credit product for a Home Delivery subscription" in {
    val subscription = Fixtures.subscriptionFromJson("EchoLegacySubscription.json")
    HolidayCreditProduct.forStage(Code)(subscription) shouldBe HolidayCreditProduct.Code.HomeDelivery
    HolidayCreditProduct.forStage(Prod)(subscription) shouldBe HolidayCreditProduct.Prod.HomeDelivery
  }

  it should "give correct credit product for a Voucher subscription" in {
    val subscription = Fixtures.subscriptionFromJson("SundayVoucherSubscription.json")
    HolidayCreditProduct.forStage(Code)(subscription) shouldBe HolidayCreditProduct.Code.Voucher
    HolidayCreditProduct.forStage(Prod)(subscription) shouldBe HolidayCreditProduct.Prod.Voucher
  }

  it should "give correct credit product for a Digital Voucher subscription" in {
    val subscription = Fixtures.subscriptionFromJson("DigitalVoucherSubscription.json")
    HolidayCreditProduct.forStage(Code)(subscription) shouldBe HolidayCreditProduct.Code.DigitalVoucher
    HolidayCreditProduct.forStage(Prod)(subscription) shouldBe HolidayCreditProduct.Prod.DigitalVoucher
  }

  it should "throw an exception when subscription has no applicable rate plan" in {
    val subscription = Fixtures.subscriptionFromJson("AlternativeSubscription.json")
    the[IllegalArgumentException] thrownBy HolidayCreditProduct.forStage(Code)(
      subscription,
    ) should have message "No holiday credit product available for subscription A-S00051570"
    the[IllegalArgumentException] thrownBy HolidayCreditProduct.forStage(Prod)(
      subscription,
    ) should have message "No holiday credit product available for subscription A-S00051570"
  }
}
