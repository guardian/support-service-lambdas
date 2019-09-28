package com.gu.holiday_stops.subscription

import com.gu.holiday_stops.{Config, ZuoraHolidayError}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import enumeratum._

object CurrentEverydayVoucherSubscriptionPredicates {
  def ratePlanIsEverydayVoucher(ratePlan: RatePlan, everydayVoucherProductRatePlanId: String): Boolean =
    ratePlan.productRatePlanId == everydayVoucherProductRatePlanId

  def ratePlanHasBeenInvoicedForAllCharges(ratePlan: RatePlan): Boolean = {
    ratePlan.ratePlanCharges.forall { ratePlanCharge =>
      (for {
        fromInclusive <- ratePlanCharge.processedThroughDate
        toExclusive <- ratePlanCharge.chargedThroughDate
      } yield {
        toExclusive isAfter fromInclusive
      }).getOrElse(false)
    }
  }

  def billingPeriodIsAnnualOrMonthOrQuarterOrSemiAnnual(ratePlan: RatePlan): Boolean = {
    val billingPeriods = ratePlan.ratePlanCharges.map(_.billingPeriod)
    val allPeriodsAreTheSame = billingPeriods.headOption.exists(bp => billingPeriods.forall(_ == bp))
    val expectedBillingPeriod = billingPeriods.forall(List(Some("Annual"), Some("Month"), Some("Quarter"), Some("Semi-Annual")).contains)
    allPeriodsAreTheSame && expectedBillingPeriod
  }
}

case class CurrentEverydayVoucherSubscription(
  subscriptionNumber: String,
  billingPeriod: String,
  price: Double,
  invoicedPeriod: CurrentInvoicedPeriod,
  ratePlanId: String,
  productRatePlanId: String,
  dayOfWeek: VoucherDayOfWeek
) extends CurrentVoucherSubscription


object CurrentEverydayVoucherSubscription {
  private def findEverydayVoucherRatePlan(
      subscription: Subscription,
      everydayVoucherProductRatePlanId: String,
      stoppedPublicationDate: StoppedPublicationDate): Option[RatePlan] = {

    subscription
      .ratePlans
      .find { ratePlan =>
        import CurrentEverydayVoucherSubscriptionPredicates._
        List(
          ratePlanIsEverydayVoucher(ratePlan, everydayVoucherProductRatePlanId),
          ratePlanHasBeenInvoicedForAllCharges(ratePlan),
          billingPeriodIsAnnualOrMonthOrQuarterOrSemiAnnual(ratePlan),
        ).forall(_ == true)
      }
  }

  def apply(
    subscription: Subscription,
    config: Config,
    stoppedPublicationDate: StoppedPublicationDate
  ): Either[ZuoraHolidayError, CurrentEverydayVoucherSubscription] = {
    findEverydayVoucherRatePlan(subscription, config.everydayVoucherConfig.productRatePlanId, stoppedPublicationDate).flatMap { currentEverydayVoucherRatePlan =>
      for {
        rpc <- currentEverydayVoucherRatePlan.ratePlanCharges.find(_.name == stoppedPublicationDate.getDayOfWeek) // find particular RPC, Saturday or Sunday
        billingPeriod <- rpc.billingPeriod
        startDateIncluding <- rpc.processedThroughDate
        endDateExcluding <- rpc.chargedThroughDate
      } yield new CurrentEverydayVoucherSubscription(
        subscriptionNumber = subscription.subscriptionNumber,
        billingPeriod = billingPeriod,
        price = rpc.price,
        invoicedPeriod = CurrentInvoicedPeriod(
          startDateIncluding = startDateIncluding,
          endDateExcluding = endDateExcluding
        ),
        ratePlanId = currentEverydayVoucherRatePlan.id,
        productRatePlanId = currentEverydayVoucherRatePlan.productRatePlanId,
        dayOfWeek = VoucherDayOfWeek.withName(stoppedPublicationDate.getDayOfWeek)
      )
    }.toRight(ZuoraHolidayError(s"Failed to determine Everyday Voucher Newspaper Guardian rate plan: $subscription"))
  }
}

