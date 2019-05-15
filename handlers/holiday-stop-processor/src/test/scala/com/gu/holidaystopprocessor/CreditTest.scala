package com.gu.holidaystopprocessor

import java.time.LocalDate

import org.scalatest.{FlatSpec, Matchers}

class CreditTest extends FlatSpec with Matchers {

  "autoRenewingHolidayCredit" should "be correct for a quarterly billing period" in {
    val subscription = Fixtures.mkSubscription(
      termEndDate = LocalDate.now,
      price = 30,
      billingPeriod = "Quarter",
      effectiveEndDate = LocalDate.of(2019, 5, 15)
    )
    val credit = Credit.autoRenewingHolidayAmount(subscription)
    credit shouldBe -2.31
  }

  "autoRenewingHolidayCredit" should "be correct for another quarterly billing period" in {
    val subscription = Fixtures.mkSubscription(
      termEndDate = LocalDate.now,
      price = 37.5,
      billingPeriod = "Quarter",
      effectiveEndDate = LocalDate.of(2019, 5, 15)
    )
    val credit = Credit.autoRenewingHolidayAmount(subscription)
    credit shouldBe -2.89
  }

  "autoRenewingHolidayCredit" should "be correct for an annual billing period" in {
    val subscription = Fixtures.mkSubscription(
      termEndDate = LocalDate.now,
      price = 120,
      billingPeriod = "Annual",
      effectiveEndDate = LocalDate.of(2019, 5, 15)
    )
    val credit = Credit.autoRenewingHolidayAmount(subscription)
    credit shouldBe -2.31
  }
}
