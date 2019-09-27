package com.gu.holiday_stops.subscription


import com.gu.holiday_stops.{BillingPeriodToApproxWeekCount, CurrentVoucherSubscription}

import scala.math.BigDecimal.RoundingMode

object VoucherHolidayCredit {
  def apply(voucherSubscription: CurrentVoucherSubscription): Double = {
    val recurringPrice = voucherSubscription.price
    val numPublicationsInPeriod =
      BillingPeriodToApproxWeekCount(
        subscriptionNumber = voucherSubscription.subscriptionNumber,
        billingPeriod = voucherSubscription.billingPeriod
      )
    -roundUp(recurringPrice / numPublicationsInPeriod)
  }

  private def roundUp(d: Double): Double = BigDecimal(d).setScale(2, RoundingMode.UP).toDouble
}
