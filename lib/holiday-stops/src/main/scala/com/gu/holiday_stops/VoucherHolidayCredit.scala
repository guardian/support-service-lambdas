package com.gu.holiday_stops.subscription

import com.gu.holiday_stops.{BillingPeriodToApproxWeekCount, CurrentVoucherSubscription}

import scala.math.BigDecimal.RoundingMode

object VoucherHolidayCredit {
  def apply(sundayVoucherSubscription: CurrentVoucherSubscription): Double = {
    val recurringPrice = sundayVoucherSubscription.price
    val numPublicationsInPeriod =
      BillingPeriodToApproxWeekCount(
        subscriptionNumber = sundayVoucherSubscription.subscriptionNumber,
        billingPeriod = sundayVoucherSubscription.billingPeriod
      )
    -roundUp(recurringPrice / numPublicationsInPeriod)
  }

  private def roundUp(d: Double): Double = BigDecimal(d).setScale(2, RoundingMode.UP).toDouble
}
