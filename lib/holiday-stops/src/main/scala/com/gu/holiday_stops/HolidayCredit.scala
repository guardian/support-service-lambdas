package com.gu.holiday_stops

import java.time.LocalDate

import scala.math.BigDecimal.RoundingMode

/**
 * Replicating manual calculation found in
 * https://docs.google.com/document/d/1N671Ei_nbln4ObZOWKvQZHnNkTgIx8EvdVJg1dHo_ak
 *
 * FIXME: Discounts should be taken into account?
 */
object HolidayCredit {
  def apply(currentGuardianWeeklySubscription: CurrentGuardianWeeklySubscription, stoppedPublicationDate: LocalDate): Double = {
    if (currentGuardianWeeklySubscription.introNforNMode.isDefined && stoppedPublicationDate.isBefore(currentGuardianWeeklySubscription.invoicedPeriod.startDateIncluding)) {
      -roundUp(1) // hardcoded because N-for-N means 1 currency unit per issue
    } else {
      val recurringPrice = currentGuardianWeeklySubscription.price
      val numPublicationsInPeriod = BillingPeriodToApproxWeekCount(currentGuardianWeeklySubscription)
      -roundUp(recurringPrice / numPublicationsInPeriod)
    }
  }

  private def roundUp(d: Double): Double = BigDecimal(d).setScale(2, RoundingMode.UP).toDouble
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
