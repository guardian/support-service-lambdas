package com.gu.holidaystopprocessor

import org.scalatest.{FlatSpec, Matchers}

class HolidayCreditTest extends FlatSpec with Matchers {

  "HolidayCredit" should "be correct for a quarterly billing period" in {
    val charge = Fixtures.mkRatePlanCharge(price = 30, billingPeriod = "Quarter")
    val subscription = Fixtures.mkSubscription()
    val ratePlans = Seq(RatePlan("", Seq(charge)))
    val credit = HolidayCredit(subscription.copy(ratePlans = ratePlans))
    credit shouldBe -2.31
  }

  it should "be correct for another quarterly billing period" in {
    val charge = Fixtures.mkRatePlanCharge(price = 37.5, billingPeriod = "Quarter")
    val subscription = Fixtures.mkSubscription()
    val ratePlans = Seq(RatePlan("", Seq(charge)))
    val credit = HolidayCredit(subscription.copy(ratePlans = ratePlans))
    credit shouldBe -2.89
  }

  it should "be correct for an annual billing period" in {
    val charge = Fixtures.mkRatePlanCharge(price = 120, billingPeriod = "Annual")
    val subscription = Fixtures.mkSubscription()
    val ratePlans = Seq(RatePlan("", Seq(charge)))
    val credit = HolidayCredit(subscription.copy(ratePlans = ratePlans))
    credit shouldBe -2.31
  }
}
