package com.gu.holiday_stops.subscription

import java.time.LocalDate

import acyclic.skipped
import cats.syntax.either._
import com.gu.holiday_stops.{ZuoraHolidayError, ZuoraHolidayResponse}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import com.gu.util.Logging

import scala.math.BigDecimal.RoundingMode

abstract class StoppedProduct(
  val subscriptionNumber: String,
  val stoppedPublicationDate: LocalDate,
  val price: Double,
  val billingPeriod: String,
  val billingSchedule: BillingSchedule,
) extends Logging {
  private def creditAmount: Double = {
    def roundUp(d: Double): Double = BigDecimal(d).setScale(2, RoundingMode.UP).toDouble
    val recurringPrice = price
    val numPublicationsInPeriod = billingPeriodToApproxWeekCount(billingPeriod)
    -roundUp(recurringPrice / numPublicationsInPeriod)
  }

  /**
   * This returns the date for the next bill after the stoppedPublicationDate.
   *
   * This currently calculates the current billing period and uses the following day. This is an over simplification
   * but works for current use cases
   *
   * For more details about the calculation of the current billing period see:
   *
   * [[com.gu.holiday_stops.subscription.BillingSchedule]]
   *
   * @return Date of the first day of the billing period
   *         following this <code>stoppedPublicationDate</code>.
   *         [[com.gu.holiday_stops.subscription.StoppedProductTest]]
   *         shows examples of the expected outcome.
   */
  private def nextBillingPeriodStartDate: LocalDate = {
    billingSchedule.billingPeriodForDate(stoppedPublicationDate).fold(
      error =>
        throw new RuntimeException(s"Failed to calculate next billing date: ${error.reason}"),
      billingPeriod =>
        billingPeriod.endDate.plusDays(1)
    )
  }

  private def billingPeriodToApproxWeekCount(billingPeriod: String): Int =
    billingPeriod match {
      case "Annual" => 52
      case "Semi_Annual" => 26
      case "Quarter" => 13
      case "Month" => 4
      case "Specific_Weeks" => 6 // FIXME: When we have others than 6-for-6
      case _ => throw new RuntimeException(s"Failed to convert billing period to weeks because unknown period: $billingPeriod")
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
}
