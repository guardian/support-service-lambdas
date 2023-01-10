package com.gu.zuora.subscription

import java.time.LocalDate
import java.time.temporal.ChronoUnit.DAYS

case class ExtendedTerm(length: Int, unit: String)

/** Applies term extension if invoice date falls outside the termEndDate.
  *
  * Addresses API error: "The Contract effective date should not be later than the term end date of the basic
  * subscription"
  */
object ExtendedTerm {
  def apply(invoiceDate: LocalDate, subscription: Subscription): Option[ExtendedTerm] = {
    if (invoiceDate.isAfter(subscription.termEndDate)) {
      Some(
        ExtendedTerm(
          length = DAYS.between(subscription.termStartDate, invoiceDate).toInt,
          unit = "Day",
        ),
      )
    } else None
  }
}
