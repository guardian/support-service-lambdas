package com.gu.holidaystopprocessor

import scala.math.BigDecimal.RoundingMode

/**
 * Replicating manual calculation found in
 * https://docs.google.com/document/d/1N671Ei_nbln4ObZOWKvQZHnNkTgIx8EvdVJg1dHo_ak
 *
 * FIXME: Discounts should be taken into account?
 */
object HolidayCredit {
  def apply(subscription: Subscription, guardianWeeklyProductRatePlanIds: List[String]): Double = {
    val currentGuardianWeeklySubscription = CurrentGuardianWeeklySubscription(subscription, guardianWeeklyProductRatePlanIds)
    val recurringPrice = currentGuardianWeeklySubscription.price
    val numPublicationsInPeriod = BillingPeriodToApproxWeekCount(currentGuardianWeeklySubscription.billingPeriod)
    def roundUp(d: Double): Double = BigDecimal(d).setScale(2, RoundingMode.UP).toDouble
    -roundUp(recurringPrice / numPublicationsInPeriod)
  }
}

// FIXME: Is this assumption safe?
object BillingPeriodToApproxWeekCount {
  def apply(billingPeriod: String): Int =
    billingPeriod match {
      case "Quarter" => 13
      case "Annual" => 52
      case _ => 52
    }
}
