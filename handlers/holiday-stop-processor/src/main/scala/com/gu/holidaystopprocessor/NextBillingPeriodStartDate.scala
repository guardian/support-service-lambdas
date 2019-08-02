package com.gu.holidaystopprocessor

import java.time.LocalDate

/**
 * Holiday credit is applied to the next invoice on the first day of the next billing period.
 *
 * 'Invoiced period' or `billing period that has already been invoiced` is defined as
 * [processedThroughDate, chargedThroughDate) meaning
 *   - from processedThroughDate inclusive
 *   - to chargedThroughDate exclusive
 *
 * Hence chargedThroughDate represents the first day of the next billing period. For quarterly
 * billing period this would be the first day of the next quarter, whilst for annual this would be
 * the first day of the next year.
 *
 * Note chargedThroughDate is an API concept. The UI and the actual invoice use the term 'Service Period'
 * where from and to dates are both inclusive.
 *
 * Note nextBillingPeriodStartDate represents a specific date yyyy-mm-dd unlike billingPeriod (quarterly)
 * or billingPeriodStartDay (1st of month).
 */
object NextBillingPeriodStartDate {
  def apply(subscription: Subscription): Either[ZuoraHolidayWriteError, LocalDate] = {
    subscription
      .originalRatePlanCharge
      .flatMap(_.chargedThroughDate)
      .toRight(ZuoraHolidayWriteError("Original rate plan charge has no charged through date. A bill run is needed to fix this."))
  }
}
