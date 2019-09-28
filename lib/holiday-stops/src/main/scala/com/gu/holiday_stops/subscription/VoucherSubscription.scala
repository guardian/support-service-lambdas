package com.gu.holiday_stops.subscription

import com.gu.holiday_stops.ZuoraHolidayError
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import enumeratum._

case class VoucherSubscription(
  subscriptionNumber: String,
  billingPeriod: String,
  price: Double,
  invoicedPeriod: CurrentInvoicedPeriod,
  ratePlanId: String,
  productRatePlanId: String,
  dayOfWeek: VoucherDayOfWeek
)

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

object VoucherSubscriptionPredicates {
  def ratePlanIsVoucher(ratePlan: RatePlan, voucherProductRatePlanId: String): Boolean =
    ratePlan.productRatePlanId == voucherProductRatePlanId

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

object VoucherSubscription {
  private def findVoucherRatePlan(
    subscription: Subscription,
    voucherProductRatePlanId: String,
    stoppedPublicationDate: StoppedPublicationDate): Option[RatePlan] = {

    subscription
      .ratePlans
      .find { ratePlan =>
        import VoucherSubscriptionPredicates._
        List(
          ratePlanIsVoucher(ratePlan, voucherProductRatePlanId),
          ratePlanHasBeenInvoicedForAllCharges(ratePlan),
          billingPeriodIsAnnualOrMonthOrQuarterOrSemiAnnual(ratePlan),
        ).forall(_ == true)
      }
  }

  def apply(
    subscription: Subscription,
    productRatePlanId: String,
    stoppedPublicationDate: StoppedPublicationDate
  ): Either[ZuoraHolidayError, VoucherSubscription] = {
    findVoucherRatePlan(subscription, productRatePlanId, stoppedPublicationDate).flatMap { voucherRatePlan =>
      for {
        rpc <- voucherRatePlan.ratePlanCharges.find(_.name == stoppedPublicationDate.getDayOfWeek) // find particular RPC, Saturday, Sunday, etc.
        billingPeriod <- rpc.billingPeriod
        startDateIncluding <- rpc.processedThroughDate
        endDateExcluding <- rpc.chargedThroughDate
      } yield new VoucherSubscription(
        subscriptionNumber = subscription.subscriptionNumber,
        billingPeriod = billingPeriod,
        price = rpc.price,
        invoicedPeriod = CurrentInvoicedPeriod(
          startDateIncluding = startDateIncluding,
          endDateExcluding = endDateExcluding
        ),
        ratePlanId = voucherRatePlan.id,
        productRatePlanId = voucherRatePlan.productRatePlanId,
        dayOfWeek = VoucherDayOfWeek.withName(stoppedPublicationDate.getDayOfWeek)
      )
    }.toRight(ZuoraHolidayError(s"Failed to determine Voucher Newspaper Guardian rate plan: $subscription"))
  }
}