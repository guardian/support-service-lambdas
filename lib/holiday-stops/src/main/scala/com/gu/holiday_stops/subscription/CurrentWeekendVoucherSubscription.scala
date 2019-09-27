package com.gu.holiday_stops.subscription

import com.gu.holiday_stops.ZuoraHolidayError
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import enumeratum._

object CurrentWeekendVoucherSubscriptionPredicates {
  def ratePlanIsWeekendVoucher(ratePlan: RatePlan, weekendVoucherProductRatePlanId: String): Boolean =
    ratePlan.productRatePlanId == weekendVoucherProductRatePlanId

  def stoppedPublicationDateFallsOnWeekend(stoppedPublicationDate: StoppedPublicationDate): Boolean =
    List("Saturday", "Sunday").contains(stoppedPublicationDate.getDayOfWeek)

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

  def weekendVoucherRatePlanHasExactlyTwoCharges(ratePlan: RatePlan): Boolean = (ratePlan.ratePlanCharges.size == 2)

  def billingPeriodIsAnnualOrMonthOrQuarterOrSemiAnnual(ratePlan: RatePlan): Boolean = {
    val billingPeriods = ratePlan.ratePlanCharges.map(_.billingPeriod)
    val allPeriodsAreTheSame = billingPeriods.headOption.exists(bp => billingPeriods.forall(_ == bp))
    val expectedBillingPeriod = billingPeriods.forall(List(Some("Annual"), Some("Month"), Some("Quarter"), Some("Semi-Annual")).contains)
    allPeriodsAreTheSame && expectedBillingPeriod
  }
}

/**
 * Flattened model of Weekend Voucher
 *
 * @param dayOfWeek Saturday or Sunday
 */
case class CurrentWeekendVoucherSubscription(
  subscriptionNumber: String,
  billingPeriod: String,
  price: Double,
  invoicedPeriod: CurrentInvoicedPeriod,
  ratePlanId: String,
  productRatePlanId: String,
  dayOfWeek: VoucherDayOfWeek
) extends CurrentVoucherSubscription


sealed trait VoucherDayOfWeek extends EnumEntry

object VoucherDayOfWeek extends Enum[VoucherDayOfWeek] {
  val values = findValues

  case object Monday extends VoucherDayOfWeek
  case object Tuesday extends VoucherDayOfWeek
  case object Wednesday extends VoucherDayOfWeek
  case object Thursday extends VoucherDayOfWeek
  case object Friday extends VoucherDayOfWeek
  case object Saturday extends VoucherDayOfWeek
  case object Sunday extends VoucherDayOfWeek
}

object CurrentWeekendVoucherSubscription {
  private def findWeekendVoucherRatePlan(
      subscription: Subscription,
      weekendVoucherProductRatePlanId: String,
      stoppedPublicationDate: StoppedPublicationDate): Option[RatePlan] = {

    subscription
      .ratePlans
      .find { ratePlan =>
        import CurrentWeekendVoucherSubscriptionPredicates._
        List(
          stoppedPublicationDateFallsOnWeekend(stoppedPublicationDate),
          ratePlanIsWeekendVoucher(ratePlan, weekendVoucherProductRatePlanId),
          ratePlanHasBeenInvoicedForAllCharges(ratePlan),
          weekendVoucherRatePlanHasExactlyTwoCharges(ratePlan),
          billingPeriodIsAnnualOrMonthOrQuarterOrSemiAnnual(ratePlan),
        ).forall(_ == true)
      }
  }

  def apply(
    subscription: Subscription,
    weekendVoucherProductRatePlanId: String,
    stoppedPublicationDate: StoppedPublicationDate
  ): Either[ZuoraHolidayError, CurrentWeekendVoucherSubscription] = {
    findWeekendVoucherRatePlan(subscription, weekendVoucherProductRatePlanId, stoppedPublicationDate).flatMap { currentWeekendVoucherRatePlan =>
      for {
        rpc <- currentWeekendVoucherRatePlan.ratePlanCharges.find(_.name == stoppedPublicationDate.getDayOfWeek) // find particular RPC, Saturday or Sunday
        billingPeriod <- rpc.billingPeriod
        startDateIncluding <- rpc.processedThroughDate
        endDateExcluding <- rpc.chargedThroughDate
      } yield new CurrentWeekendVoucherSubscription(
        subscriptionNumber = subscription.subscriptionNumber,
        billingPeriod = billingPeriod,
        price = rpc.price,
        invoicedPeriod = CurrentInvoicedPeriod(
          startDateIncluding = startDateIncluding,
          endDateExcluding = endDateExcluding
        ),
        ratePlanId = currentWeekendVoucherRatePlan.id,
        productRatePlanId = currentWeekendVoucherRatePlan.productRatePlanId,
        dayOfWeek = VoucherDayOfWeek.withName(stoppedPublicationDate.getDayOfWeek)
      )
    }.toRight(ZuoraHolidayError(s"Failed to determine Weekend Voucher Newspaper Guardian rate plan: $subscription"))
  }
}

