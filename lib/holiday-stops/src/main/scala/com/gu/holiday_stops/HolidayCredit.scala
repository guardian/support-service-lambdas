package com.gu.holiday_stops

import scala.math.BigDecimal.RoundingMode

/**
 * Replicating manual calculation found in
 * https://docs.google.com/document/d/1N671Ei_nbln4ObZOWKvQZHnNkTgIx8EvdVJg1dHo_ak
 *
 * FIXME: Discounts should be taken into account?
 */
object HolidayCredit {
  def apply(currentGuardianWeeklySubscription: CurrentGuardianWeeklySubscription): Double = {
    val recurringPrice = currentGuardianWeeklySubscription.price
    val numPublicationsInPeriod = BillingPeriodToApproxWeekCount(currentGuardianWeeklySubscription)
    def roundUp(d: Double): Double = BigDecimal(d).setScale(2, RoundingMode.UP).toDouble
    -roundUp(recurringPrice / numPublicationsInPeriod)
  }
}

// FIXME: Is this assumption safe?
object BillingPeriodToApproxWeekCount {
  def apply(currentGuardianWeeklySubscription: CurrentGuardianWeeklySubscription): Int =
    currentGuardianWeeklySubscription.billingPeriod match {
      case "Quarter" => 13
      case "Annual" => 52
      case _ => throw new RuntimeException(s"Failed to convert billing period to weeks because unexpected billing period: $currentGuardianWeeklySubscription")
    }
}
