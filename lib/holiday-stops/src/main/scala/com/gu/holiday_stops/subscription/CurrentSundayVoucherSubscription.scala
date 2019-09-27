package com.gu.holiday_stops.subscription

import java.time.temporal.ChronoUnit

import cats.implicits._
import com.gu.holiday_stops.{Config, ZuoraHolidayWriteError}

object CurrentSundayVoucherSubscriptionPredicate {
  def ratePlanIsSundayVoucher(ratePlan: RatePlan, sundayVoucherProductRatePlanChargeId: String): Boolean =
    ratePlan.ratePlanCharges.headOption.exists { ratePlanCharge => // by SundayVoucherRatePlanHasExactlyOneCharge
      sundayVoucherProductRatePlanChargeId == ratePlanCharge.productRatePlanChargeId
    }

  def sundayVoucherRatePlanHasBeenInvoicedForOneMonth(ratePlan: RatePlan): Boolean = {
    (
      ratePlan.ratePlanCharges.headOption.flatMap(_.processedThroughDate),
      ratePlan.ratePlanCharges.headOption.flatMap(_.chargedThroughDate)
    ).mapN { (fromInclusive, toExclusive) =>
        toExclusive.isAfter(fromInclusive) && ChronoUnit.MONTHS.between(fromInclusive, toExclusive) == 1
      }.getOrElse(false)
  }

  def sundayVoucherRatePlanHasExactlyOneCharge(ratePlan: RatePlan): Boolean = (ratePlan.ratePlanCharges.size == 1)

  def chargeIsMonthly(ratePlan: RatePlan): Boolean =
    (for {
      ratePlanCharge <- ratePlan.ratePlanCharges.headOption
      billingPeriod <- ratePlanCharge.billingPeriod
    } yield billingPeriod == "Month").getOrElse(false)

}

case class CurrentSundayVoucherSubscription(
  subscriptionNumber: String,
  billingPeriod: String,
  price: Double,
  invoicedPeriod: CurrentInvoicedPeriod,
  ratePlanId: String,
  productRatePlanId: String,
  productRatePlanChargeId: String // unique identifier of product
)

object CurrentSundayVoucherSubscription {

  private def findSundayVoucherRatePlan(subscription: Subscription, sundayVoucherProductRatePlanChargeId: String): Option[RatePlan] =
    subscription
      .ratePlans
      .find { ratePlan =>
        import CurrentSundayVoucherSubscriptionPredicate._
        List(
          sundayVoucherRatePlanHasExactlyOneCharge(ratePlan),
          ratePlanIsSundayVoucher(ratePlan, sundayVoucherProductRatePlanChargeId),
          sundayVoucherRatePlanHasBeenInvoicedForOneMonth(ratePlan),
          chargeIsMonthly(ratePlan)
        ).forall(_ == true)
      }

  def apply(
    subscription: Subscription,
    config: Config
  ): Either[ZuoraHolidayWriteError, CurrentSundayVoucherSubscription] = {

    findSundayVoucherRatePlan(subscription, config.sundayVoucherConfig.productRatePlanChargeId).flatMap { currentSundayVoucherRatePlan =>
      for {
        currentSundayVoucherRatePlanRatePlanCharge <- currentSundayVoucherRatePlan.ratePlanCharges.headOption
        billingPeriod <- currentSundayVoucherRatePlanRatePlanCharge.billingPeriod
        startDateIncluding <- currentSundayVoucherRatePlanRatePlanCharge.processedThroughDate
        endDateExcluding <- currentSundayVoucherRatePlanRatePlanCharge.chargedThroughDate
      } yield new CurrentSundayVoucherSubscription(
        subscriptionNumber = subscription.subscriptionNumber,
        billingPeriod = billingPeriod,
        price = currentSundayVoucherRatePlanRatePlanCharge.price,
        invoicedPeriod = CurrentInvoicedPeriod(
          startDateIncluding = startDateIncluding,
          endDateExcluding = endDateExcluding
        ),
        ratePlanId = currentSundayVoucherRatePlan.id,
        productRatePlanId = currentSundayVoucherRatePlan.productRatePlanId,
        productRatePlanChargeId = currentSundayVoucherRatePlanRatePlanCharge.productRatePlanChargeId
      )
    }.toRight(ZuoraHolidayWriteError(s"Failed to determine Sunday Voucher Newspaper Guardian rate plan: $subscription"))

  }
}
