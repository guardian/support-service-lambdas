package com.gu.holiday_stops

import java.time.LocalDate
import java.time.temporal.ChronoUnit.DAYS

case class ExtendedTerm(length: Int, unit: String)

/**
 * Applies term extension if next invoice start date (chargedThroughDate) falls outside the termEndDate.
 *
 * Addresses API error:
 *   "The Contract effective date should not be later than the term end date of the basic subscription"
 */
object ExtendedTerm {
  def apply(chargedThroughDate: LocalDate, subscription: Subscription): Option[ExtendedTerm] = {
    if (chargedThroughDate.isAfter(subscription.termEndDate)) {
      Some(ExtendedTerm(
        length = DAYS.between(subscription.termStartDate, chargedThroughDate).toInt,
        unit = "Day"
      ))
    } else None
  }
}
