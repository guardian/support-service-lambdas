package com.gu.holidaystopprocessor

import java.time.LocalDate

/**
 * Invoiced period is defined as [processedThroughDate, chargedThroughDate) meaning
 *   - from processedThroughDate inclusive
 *   - to chargedThroughDate exclusive
 *
 * Hence chargedThroughDate represents the first day of the next invoiced period. For quarterly
 * billing period this would be the first day of the next quarter, whilst for annual this would be
 * the first day of the next year.
 *
 * Note chargedThroughDate is an API concept. The UI and the actual invoice use the term 'Service Period'
 * where from and to dates are both inclusive.
 */
object NextInvoiceStartDate {
  def apply(subscription: Subscription): Either[HolidayStopFailure, LocalDate] = {
    subscription
      .originalRatePlanCharge
      .flatMap(_.chargedThroughDate)
      .toRight(HolidayStopFailure("Original rate plan charge has no charged through date. A bill run is needed to fix this."))
  }
}
