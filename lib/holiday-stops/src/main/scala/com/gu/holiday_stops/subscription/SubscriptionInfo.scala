package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.{ZuoraHolidayError, ZuoraHolidayResponse}
import cats.implicits._

import scala.collection.immutable

case class SubscriptionInfo(subscription: Subscription, ratePlanChargeInfo: List[RatePlanChargeInfo]) {
  def ratePlanChargeInfoForDate(date: LocalDate): Either[ZuoraHolidayError, RatePlanChargeInfo] = {
    ratePlanChargeInfo
      .find { ratePlanCharge =>
        ratePlanCharge.billingSchedule.isDateCoveredBySchedule(date) &&
          ratePlanCharge.issueDayOfWeek == date.getDayOfWeek
      }
      .toRight(
        ZuoraHolidayError(s"Subscription ${subscription.subscriptionNumber} does not have a rate plan for date $date")
      )
  }
}

object SubscriptionInfo {
  def apply(subscription: Subscription): Either[ZuoraHolidayError, SubscriptionInfo] = {
    val supportedRatePlanCharges: immutable.Seq[(RatePlanCharge, SupportedRatePlanCharge)] = for {
      ratePlan <- subscription.ratePlans
      supportedProduct <- getSupportedProductForRatePlan(ratePlan).toList
      supportedRatePlan <- getSupportedRatePlanForRatePlan(ratePlan, supportedProduct).toList
      unExpiredRatePlanCharge <- getUnexpiredRatePlanCharges(ratePlan)
      supportedRatePlanCharge <- getSupportedRatePlanCharge(supportedRatePlan, unExpiredRatePlanCharge)
    } yield (unExpiredRatePlanCharge, supportedRatePlanCharge)

    supportedRatePlanCharges
      .toList
      .traverse[ZuoraHolidayResponse, RatePlanChargeInfo] {
        case (ratePlanCharge, supportedRatePlanCharge) =>
          RatePlanChargeInfo(ratePlanCharge, supportedRatePlanCharge.dayOfWeek)
      }
      .map(SubscriptionInfo(subscription, _))
  }

  private def getSupportedRatePlanCharge(supportedRatePlan: SupportedRatePlan, unExpiredRatePlanCharge: RatePlanCharge) = {
    supportedRatePlan.ratePlanCharges.find(_.name == unExpiredRatePlanCharge.name)
  }

  private def getSupportedRatePlanForRatePlan(ratePlan: RatePlan, supportedProduct: SupportedProduct) = {
    supportedProduct.ratePlans.find(_.name == ratePlan.ratePlanName)
  }

  private def getSupportedProductForRatePlan(ratePlan: RatePlan) = {
    SupportedProduct.supportedProducts.find(_.name == ratePlan.productName)
  }

  private def getUnexpiredRatePlanCharges(ratePlan: RatePlan) = {
    ratePlan.ratePlanCharges.filter(_.chargedThroughDate.map(!_.isBefore(MutableCalendar.today)).getOrElse(true))
  }
}
