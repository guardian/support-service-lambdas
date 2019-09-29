package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.{ZuoraHolidayError, ZuoraHolidayResponse}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import cats.syntax.either._
import acyclic.skipped
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

abstract class StoppedProduct(
  val subscriptionNumber: String,
  val stoppedPublicationDate: LocalDate,
  val price: Double,
  val billingPeriod: String,
  val invoicedPeriod: CurrentInvoicedPeriod,
) {
  def credit: Double = {
    def roundUp(d: Double): Double = BigDecimal(d).setScale(2, RoundingMode.UP).toDouble
    val recurringPrice = price
    val numPublicationsInPeriod = billingPeriodToApproxWeekCount(billingPeriod)
    -roundUp(recurringPrice / numPublicationsInPeriod)
  }

  def nextBillingPeriodStartDate: LocalDate = invoicedPeriod.endDateExcluding

  private def billingPeriodToApproxWeekCount(billingPeriod: String): Int =
      billingPeriod match {
        case "Annual" => 52
        case "Semi-Annual" => 26
        case "Quarter" => 13
        case "Month" => 4
        case "Specific_Weeks" => 6 // FIXME: When we have others than 6-for-6
        case _ => throw new RuntimeException(s"Failed to convert billing period to weeks because unknown period: $billingPeriod") // FIXME: Either
      }
}

object StoppedProduct {
  def apply(subscription: Subscription, stoppedPublicationDate: StoppedPublicationDate): ZuoraHolidayResponse[StoppedProduct] = {
    (GuardianWeeklySubscription(subscription, stoppedPublicationDate)
      .orElse(VoucherSubscription(subscription, stoppedPublicationDate))
      .orElse(Left(ZuoraHolidayError(s"Failed to determine StoppableProduct: ${subscription.subscriptionNumber}; ${stoppedPublicationDate}"))))
  }
}

