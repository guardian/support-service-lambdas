package com.gu.holiday_stops.subscription

import com.gu.holiday_stops.{Config, ZuoraHolidayError}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import enumeratum._

object CurrentSixdayVoucherSubscriptionPredicates {
  def ratePlanIsSixdayVoucher(ratePlan: RatePlan, sixdayVoucherProductRatePlanId: String): Boolean =
    ratePlan.productRatePlanId == sixdayVoucherProductRatePlanId

  def stoppedPublicationIsNotOnSunday(stoppedPublicationDate: StoppedPublicationDate): Boolean =
    List("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday").contains(stoppedPublicationDate.getDayOfWeek)

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

case class CurrentSixdayVoucherSubscription(
  subscriptionNumber: String,
  billingPeriod: String,
  price: Double,
  invoicedPeriod: CurrentInvoicedPeriod,
  ratePlanId: String,
  productRatePlanId: String,
  dayOfWeek: VoucherDayOfWeek
) extends CurrentVoucherSubscription


object CurrentSixdayVoucherSubscription {
  private def findSixdayVoucherRatePlan(
      subscription: Subscription,
      sixdayVoucherProductRatePlanId: String,
      stoppedPublicationDate: StoppedPublicationDate): Option[RatePlan] = {

    subscription
      .ratePlans
      .find { ratePlan =>
        import CurrentSixdayVoucherSubscriptionPredicates._
        List(
          stoppedPublicationIsNotOnSunday(stoppedPublicationDate),
          ratePlanIsSixdayVoucher(ratePlan, sixdayVoucherProductRatePlanId),
          ratePlanHasBeenInvoicedForAllCharges(ratePlan), // FIXME: Why is Saturday not billed?
          billingPeriodIsAnnualOrMonthOrQuarterOrSemiAnnual(ratePlan),
        ).forall(_ == true)
      }
  }

  def apply(
    subscription: Subscription,
    config: Config,
    stoppedPublicationDate: StoppedPublicationDate
  ): Either[ZuoraHolidayError, CurrentSixdayVoucherSubscription] = {
    findSixdayVoucherRatePlan(subscription, config.sixdayVoucherConfig.productRatePlanId, stoppedPublicationDate).flatMap { currentSixdayVoucherRatePlan =>
      for {
        rpc <- currentSixdayVoucherRatePlan.ratePlanCharges.find(_.name == stoppedPublicationDate.getDayOfWeek) // find particular RPC, Saturday or Sunday
        billingPeriod <- rpc.billingPeriod
        startDateIncluding <- rpc.processedThroughDate
        endDateExcluding <- rpc.chargedThroughDate
      } yield new CurrentSixdayVoucherSubscription(
        subscriptionNumber = subscription.subscriptionNumber,
        billingPeriod = billingPeriod,
        price = rpc.price,
        invoicedPeriod = CurrentInvoicedPeriod(
          startDateIncluding = startDateIncluding,
          endDateExcluding = endDateExcluding
        ),
        ratePlanId = currentSixdayVoucherRatePlan.id,
        productRatePlanId = currentSixdayVoucherRatePlan.productRatePlanId,
        dayOfWeek = VoucherDayOfWeek.withName(stoppedPublicationDate.getDayOfWeek)
      )
    }.toRight(ZuoraHolidayError(s"Failed to determine Sixday Voucher Newspaper Guardian rate plan: $subscription"))
  }
}

