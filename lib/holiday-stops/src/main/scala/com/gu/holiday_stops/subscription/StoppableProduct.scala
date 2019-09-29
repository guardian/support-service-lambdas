package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.BillingPeriodToApproxWeekCount
import scala.math.BigDecimal.RoundingMode

/**
 * Invoiced period defined by [startDateIncluding, endDateExcluding) specifies the current period for which
 * the customer has been billed.
 *
 * @param startDateIncluding service active on startDateIncluding; corresponds to processedThroughDate
 * @param endDateExcluding service ends on endDateExcluding; corresponds to chargedThroughDate
 */
case class CurrentInvoicedPeriod(startDateIncluding: LocalDate, endDateExcluding: LocalDate)

/**
 * Is date between two dates where including the start while excluding the end?
 */
object PeriodContainsDate extends ((LocalDate, LocalDate, LocalDate) => Boolean) {
  def apply(
    startPeriodInclusive: LocalDate,
    endPeriodExcluding: LocalDate,
    date: LocalDate
  ): Boolean =
    (date.isEqual(startPeriodInclusive) || date.isAfter(startPeriodInclusive)) && date.isBefore(endPeriodExcluding)
}

abstract class StoppableProduct(
  val subscriptionNumber: String,
  val stoppedPublicationDate: LocalDate,
  val price: Double,
  val billingPeriod: String,
  val invoicedPeriod: CurrentInvoicedPeriod,
) {
  def credit: Double = {
    def roundUp(d: Double): Double = BigDecimal(d).setScale(2, RoundingMode.UP).toDouble
    val recurringPrice = price
    val numPublicationsInPeriod = BillingPeriodToApproxWeekCount(billingPeriod)
    -roundUp(recurringPrice / numPublicationsInPeriod)
  }

  def nextBillingPeriodStartDate: LocalDate = invoicedPeriod.endDateExcluding
}
