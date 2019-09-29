package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.BillingPeriodToApproxWeekCount

import scala.math.BigDecimal.RoundingMode

/**
 * Replicating manual calculation found in
 * https://docs.google.com/document/d/1N671Ei_nbln4ObZOWKvQZHnNkTgIx8EvdVJg1dHo_ak
 */
object GuardianWeeklyHolidayCredit {
  def apply(currentGuardianWeeklySubscription: GuardianWeeklySubscription, stoppedPublicationDate: LocalDate): Double = {
    val recurringPrice = currentGuardianWeeklySubscription.price
    val numPublicationsInPeriod =
      BillingPeriodToApproxWeekCount(
        subscriptionNumber = currentGuardianWeeklySubscription.subscriptionNumber,
        billingPeriod = currentGuardianWeeklySubscription.billingPeriod
      )
    -roundUp(recurringPrice / numPublicationsInPeriod)
  }

  private def roundUp(d: Double): Double = BigDecimal(d).setScale(2, RoundingMode.UP).toDouble
}
