package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.BillingPeriodToApproxWeekCount

import scala.math.BigDecimal.RoundingMode

object SundayVoucherHolidayCredit {
  def apply(sundayVoucherSubscription: CurrentSundayVoucherSubscription, stoppedPublicationDate: LocalDate): Double = {
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
