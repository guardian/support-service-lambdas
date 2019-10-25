package com.gu.holiday_stops.subscription

import java.time.{DayOfWeek, LocalDate}

import com.gu.holiday_stops.{ZuoraHolidayError, ZuoraHolidayResponse}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import enumeratum._
import acyclic.skipped
import com.gu.holiday_stops.subscription.StoppedProduct._

case class VoucherSubscription(
                                override val subscriptionNumber: String,
                                override val billingPeriod: String,
                                override val price: Double,
                                override val billingSchedule: RatePlanChargeBillingSchedule,
                                override val stoppedPublicationDate: LocalDate,
                                override val billingPeriodForDate: BillingPeriod,
                                dayOfWeek: VoucherDayOfWeek,
) extends StoppedProduct(
  subscriptionNumber,
  stoppedPublicationDate,
  price,
  billingPeriod,
  billingSchedule,
  billingPeriodForDate
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
  def ratePlanIsVoucher(ratePlan: RatePlan, stoppedPublicationDate: StoppedPublicationDate): Boolean =
    ratePlan.productName == "Newspaper Voucher" && ratePlan.ratePlanCharges.exists(_.name == stoppedPublicationDate.getDayOfWeek)

  def allBillingPeriodsAreTheSame(ratePlan: RatePlan): Boolean = {
    val billingPeriods = ratePlan.ratePlanCharges.map(_.billingPeriod)
    billingPeriods.headOption.exists(bp => billingPeriods.forall(_ == bp))
  }
}

object VoucherSubscription {
  private def findVoucherRatePlan(
    subscription: Subscription,
    stoppedPublicationDate: StoppedPublicationDate
  ): Either[ZuoraHolidayError, RatePlan] = {
    subscription
      .ratePlans
      .find { ratePlan =>
        import VoucherSubscriptionPredicates._
        List(
          ratePlanIsVoucher(ratePlan, stoppedPublicationDate),
          allBillingPeriodsAreTheSame(ratePlan)
        ).forall(_ == true)
      }
      .toRight(
        ZuoraHolidayError(
          s"Could not find voucher subscription for ${subscription.subscriptionNumber} on $stoppedPublicationDate"
        )
      )
  }

  def findRatePlanChargeForDayOfWeek(dayOfWeek: DayOfWeek, ratePlanCharges: List[RatePlanCharge]) = {
    ratePlanCharges
      .find(_.name == dayOfWeek.toString.toLowerCase.capitalize)
      .toRight(
        ZuoraHolidayError(
          s"Could not find rate plan charge for $dayOfWeek"
        )
      )
  }

  def apply(subscription: Subscription, stoppedPublicationDate: StoppedPublicationDate): ZuoraHolidayResponse[VoucherSubscription] = {
    for {
      voucherRatePlan <- findVoucherRatePlan(subscription, stoppedPublicationDate)
      ratePlanChargeForDay <- findRatePlanChargeForDayOfWeek(
        stoppedPublicationDate.value.getDayOfWeek,
        voucherRatePlan.ratePlanCharges
      )
      ratePlanChargeInfo <- RatePlanChargeInfo(ratePlanChargeForDay)
      billingPeriodForStopDate <- ratePlanChargeInfo.billingSchedule.billingPeriodForDate(stoppedPublicationDate.value)
    } yield new VoucherSubscription(
      subscriptionNumber = subscription.subscriptionNumber,
      billingPeriod = ratePlanChargeInfo.billingSchedule.billingPeriodZuoraId,
      price = ratePlanChargeInfo.ratePlan.price,
      billingSchedule = ratePlanChargeInfo.billingSchedule,
      stoppedPublicationDate.value,
      dayOfWeek = VoucherDayOfWeek.withName(stoppedPublicationDate.getDayOfWeek),
      billingPeriodForDate = billingPeriodForStopDate
    )
  }
}
