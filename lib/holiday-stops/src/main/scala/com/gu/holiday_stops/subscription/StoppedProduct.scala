package com.gu.holiday_stops.subscription

import java.time.{LocalDate, Period}

import acyclic.skipped
import cats.syntax.either._
import com.gu.holiday_stops.{ZuoraHolidayError, ZuoraHolidayResponse}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import com.gu.util.Logging

import scala.annotation.tailrec
import scala.math.BigDecimal.RoundingMode

/**
 * Invoiced period defined by [startDateIncluding, endDateExcluding) specifies the current period for which
 * the customer has been billed.
 *
 * @param startDateIncluding service active on startDateIncluding; corresponds to processedThroughDate
 * @param endDateExcluding service ends on endDateExcluding; corresponds to chargedThroughDate
 */
case class CurrentInvoicedPeriod(startDateIncluding: LocalDate, endDateExcluding: LocalDate) {

  /**
   * Is date between two dates where including the start while excluding the end?
   */
  def containsDate(date: LocalDate): Boolean =
    (date.isEqual(startDateIncluding) || date.isAfter(startDateIncluding)) &&
    date.isBefore(endDateExcluding)
}

abstract class StoppedProduct(
  val subscriptionNumber: String,
  val stoppedPublicationDate: LocalDate,
  val price: Double,
  val billingPeriod: String,
  val invoicedPeriod: CurrentInvoicedPeriod,
) extends Logging {
  private def creditAmount: Double = {
    def roundUp(d: Double): Double = BigDecimal(d).setScale(2, RoundingMode.UP).toDouble
    val recurringPrice = price
    val numPublicationsInPeriod = billingPeriodToApproxWeekCount(billingPeriod)
    -roundUp(recurringPrice / numPublicationsInPeriod)
  }

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
   * the first day of the next year of the subscription.
   *
   * Note chargedThroughDate is an API concept. The UI and the actual invoice use the term 'Service Period'
   * where from and to dates are both inclusive.
   *
   * Note nextBillingPeriodStartDate represents a specific date yyyy-mm-dd unlike billingPeriod (eg. "quarterly")
   * or billingPeriodStartDay (eg. 1st of month).
   *
   * There is a complication when reader has N-for-N intro plan (for example, GW Oct 18 - Six for Six - Domestic).
   * If the holiday falls within N-for-N then credit should be applied on the first regular invoice, not the next billing
   * period of GW regular plan.
   *
   * @return Date of the first day of the billing period
   *         following this <code>stoppedPublicationDate</code>.
   *         [[com.gu.holiday_stops.subscription.StoppedProductTest]]
   *         shows examples of the expected outcome.
   */
  private def nextBillingPeriodStartDate: LocalDate = {

    logger.info(s"Calculating nextBillingPeriodStartDate for $this")

    if (billingPeriod == "Specific_Weeks") invoicedPeriod.endDateExcluding
    else {

      val billingPeriodDuration: Period = billingPeriod match {
        case "Annual" => Period.ofYears(1)
        case "Semi-Annual" => Period.ofMonths(6)
        case "Quarter" => Period.ofMonths(3)
        case "Month" => Period.ofMonths(1)
        case _ => throw new RuntimeException(
          s"Failed to determine duration of billing period: $billingPeriod"
        )
      }

      @tailrec
      def go(invoicePeriod: CurrentInvoicedPeriod): LocalDate =
        if (invoicePeriod.containsDate(stoppedPublicationDate))
          invoicePeriod.endDateExcluding
        else
          go(CurrentInvoicedPeriod(
            startDateIncluding = invoicePeriod.endDateExcluding,
            endDateExcluding = invoicePeriod.endDateExcluding.plus(billingPeriodDuration)
          ))

      go(invoicedPeriod)
    }
  }

  private def billingPeriodToApproxWeekCount(billingPeriod: String): Int =
    billingPeriod match {
      case "Annual" => 52
      case "Semi-Annual" => 26
      case "Quarter" => 13
      case "Month" => 4
      case "Specific_Weeks" => 6 // FIXME: When we have others than 6-for-6
      case _ => throw new RuntimeException(s"Failed to convert billing period to weeks because unknown period: $billingPeriod") // FIXME: Either
    }

  def credit = HolidayStopCredit(amount = creditAmount, invoiceDate = nextBillingPeriodStartDate)
}

object StoppedProduct {
  def apply(subscription: Subscription, stoppedPublicationDate: StoppedPublicationDate): ZuoraHolidayResponse[StoppedProduct] = {
    GuardianWeeklySubscription(subscription, stoppedPublicationDate)
      .orElse(VoucherSubscription(subscription, stoppedPublicationDate))
      .orElse(Left(ZuoraHolidayError(s"Failed to determine StoppableProduct: ${subscription.subscriptionNumber}; ${stoppedPublicationDate}")))
  }

  def stoppedPublicationDateIsAfterCurrentInvoiceStartDate(
      ratePlan: RatePlan,
      stoppedPublicationDate: StoppedPublicationDate
  ): Boolean = {
    ratePlan.ratePlanCharges.forall { ratePlanCharge =>
      (for {
        fromInclusive <- ratePlanCharge.processedThroughDate
        _ <- ratePlanCharge.chargedThroughDate
      } yield {
        stoppedPublicationDate.value.isEqual(fromInclusive) || stoppedPublicationDate.value.isAfter(fromInclusive)
      }).getOrElse(false)
    }
  }

  def stoppedPublicationDateFallsStrictlyWithinInvoicedPeriod(
    ratePlan: RatePlan,
    stoppedPublicationDate: StoppedPublicationDate,
  ): Boolean = {
    ratePlan.ratePlanCharges.forall { ratePlanCharge =>
      (for {
        fromInclusive <- ratePlanCharge.processedThroughDate
        toExclusive <- ratePlanCharge.chargedThroughDate
      } yield {
        (toExclusive isAfter fromInclusive) && CurrentInvoicedPeriod(fromInclusive, toExclusive).containsDate(stoppedPublicationDate.value)
      }).getOrElse(false)
    }
  }
}
