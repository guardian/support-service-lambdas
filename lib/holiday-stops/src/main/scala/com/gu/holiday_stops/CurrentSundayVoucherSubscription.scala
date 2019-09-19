package com.gu.holiday_stops

import java.time.temporal.ChronoUnit

import scala.util.Try

object CurrentSundayVoucherSubscriptionPredicate {
  def ratePlanIsSundayVoucher(ratePlan: RatePlan, sundayVoucherProductRatePlanChargeId: String): Boolean =
    ratePlan.ratePlanCharges.headOption.exists { ratePlanCharge => // by SundayVoucherRatePlanHasExactlyOneCharge
      sundayVoucherProductRatePlanChargeId == ratePlanCharge.productRatePlanChargeId
    }

  def sundayVoucherRatePlanHasBeenInvoicedForOneMonth(ratePlan: RatePlan): Boolean = {
    Try {
      val fromInclusive = ratePlan.ratePlanCharges.head.processedThroughDate.get
      val toExclusive = ratePlan.ratePlanCharges.head.chargedThroughDate.get
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
    sundayVoucherProductRatePlanChargeId: String
  ): Either[ZuoraHolidayWriteError, CurrentSundayVoucherSubscription] = {

    findSundayVoucherRatePlan(subscription, sundayVoucherProductRatePlanChargeId)
      .map { currentSundayVoucherRatePlan => // these ugly gets are safe due to above conditions
        val currentSundayVoucherRatePlanRatePlanCharge = currentSundayVoucherRatePlan.ratePlanCharges.head
        new CurrentSundayVoucherSubscription(
          subscriptionNumber = subscription.subscriptionNumber,
          billingPeriod = currentSundayVoucherRatePlanRatePlanCharge.billingPeriod.get,
          price = currentSundayVoucherRatePlanRatePlanCharge.price,
          invoicedPeriod = CurrentInvoicedPeriod(
            startDateIncluding = currentSundayVoucherRatePlanRatePlanCharge.processedThroughDate.get,
            endDateExcluding = currentSundayVoucherRatePlanRatePlanCharge.chargedThroughDate.get
          ),
          ratePlanId = currentSundayVoucherRatePlan.id,
          productRatePlanId = currentSundayVoucherRatePlan.productRatePlanId,
          productRatePlanChargeId = currentSundayVoucherRatePlanRatePlanCharge.productRatePlanChargeId
        )
      }
      .toRight(ZuoraHolidayWriteError(s"Failed to determine Sunday Voucher Newspaper Guardian rate plan: $subscription"))

  }
}
