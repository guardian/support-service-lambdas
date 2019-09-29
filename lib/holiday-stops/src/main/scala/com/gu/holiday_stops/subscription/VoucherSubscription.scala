package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.{BillingPeriodToApproxWeekCount, ZuoraHolidayError, ZuoraHolidayResponse}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import enumeratum._

case class VoucherSubscription(
  subscriptionNumber: String,
  override val billingPeriod: String,
  override val price: Double,
  override val invoicedPeriod: CurrentInvoicedPeriod,
  ratePlanId: String,
  productRatePlanId: String,
  dayOfWeek: VoucherDayOfWeek,
  override val stoppedPublicationDate: LocalDate
) extends StoppableProduct(stoppedPublicationDate, price, billingPeriod, invoicedPeriod)

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
  def ratePlanIsVoucher(ratePlan: RatePlan, stoppedPublicationDate: StoppedPublicationDate): Boolean =
    ratePlan.productName == "Newspaper Voucher" && ratePlan.ratePlanCharges.exists(_.name == stoppedPublicationDate.getDayOfWeek)

  def stoppedPublicationDateFallsWithinInvoicedPeriod(ratePlan: RatePlan, stoppedPublicationDate: StoppedPublicationDate): Boolean = {
    ratePlan.ratePlanCharges.forall { ratePlanCharge =>
      (for {
        fromInclusive <- ratePlanCharge.processedThroughDate
        toExclusive <- ratePlanCharge.chargedThroughDate
      } yield {
        (toExclusive isAfter fromInclusive) && PeriodContainsDate(fromInclusive, toExclusive, stoppedPublicationDate.value)
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
    stoppedPublicationDate: StoppedPublicationDate
  ): Option[RatePlan] = {

    subscription
      .ratePlans
      .find { ratePlan =>
        import VoucherSubscriptionPredicates._
        List(
          ratePlanIsVoucher(ratePlan, stoppedPublicationDate),
          stoppedPublicationDateFallsWithinInvoicedPeriod(ratePlan, stoppedPublicationDate),
          billingPeriodIsAnnualOrMonthOrQuarterOrSemiAnnual(ratePlan)
        ).forall(_ == true)
      }
  }

  def apply(subscription: Subscription, stoppedPublicationDate: StoppedPublicationDate): ZuoraHolidayResponse[VoucherSubscription] = {
    findVoucherRatePlan(subscription, stoppedPublicationDate).flatMap { voucherRatePlan =>
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
        dayOfWeek = VoucherDayOfWeek.withName(stoppedPublicationDate.getDayOfWeek),
        stoppedPublicationDate.value
      )
    }.toRight(ZuoraHolidayError(s"Failed to determine Voucher Newspaper Guardian rate plan: $subscription"))
  }
}
