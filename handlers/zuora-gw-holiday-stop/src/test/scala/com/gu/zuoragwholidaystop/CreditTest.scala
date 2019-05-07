package com.gu.zuoragwholidaystop

import com.gu.zuoragwholidaystop.Credit.autoRenewingHolidayCredit
import com.gu.zuoragwholidaystop.Fixtures.mkSubscription
import org.scalatest.{FlatSpec, Matchers}

class CreditTest extends FlatSpec with Matchers {

  "autoRenewingHolidayCredit" should "be correct for a quarterly billing period" in {
    val subscription = mkSubscription(price = 30, billingPeriod = "Quarter")
    val credit = autoRenewingHolidayCredit(subscription)
    credit shouldBe -2.5
  }

  "autoRenewingHolidayCredit" should "be correct for another quarterly billing period" in {
    val subscription = mkSubscription(price = 37.5, billingPeriod = "Quarter")
    val credit = autoRenewingHolidayCredit(subscription)
    credit shouldBe -3.13
  }

  "autoRenewingHolidayCredit" should "be correct for an annual billing period" in {
    val subscription = mkSubscription(price = 120, billingPeriod = "Annual")
    val credit = autoRenewingHolidayCredit(subscription)
    credit shouldBe -2.31
  }
}
