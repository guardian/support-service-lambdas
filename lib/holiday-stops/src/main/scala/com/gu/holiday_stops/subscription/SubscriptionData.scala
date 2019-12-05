package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.{ZuoraHolidayError, ZuoraHolidayResponse}
import cats.implicits._

import scala.collection.immutable

case class IssueData(issueDate: LocalDate, billingPeriod: BillingPeriod, credit: Double)

trait SubscriptionData {
  def issueDataForDate(issueDate: LocalDate): Either[ZuoraHolidayError, IssueData]
}

object SubscriptionData {
  def apply(subscription: Subscription): Either[ZuoraHolidayError, SubscriptionData] = {
    val supportedRatePlanCharges: immutable.Seq[(RatePlanCharge, SupportedRatePlanCharge)] = for {
      ratePlan <- subscription.ratePlans
      supportedProduct <- getSupportedProductForRatePlan(ratePlan).toList
      supportedRatePlan <- getSupportedRatePlanForRatePlan(ratePlan, supportedProduct).toList
      unExpiredRatePlanCharge <- getUnexpiredRatePlanCharges(ratePlan)
      supportedRatePlanCharge <- getSupportedRatePlanCharge(supportedRatePlan, unExpiredRatePlanCharge)
    } yield (unExpiredRatePlanCharge, supportedRatePlanCharge)

    for {
      ratePlanChargeData <- supportedRatePlanCharges
        .toList
        .traverse[ZuoraHolidayResponse, RatePlanChargeData] {
          case (ratePlanCharge, supportedRatePlanCharge) =>
            RatePlanChargeData(ratePlanCharge, supportedRatePlanCharge.dayOfWeek)
        }
    } yield new SubscriptionData {
      def issueDataForDate(issueDate: LocalDate): Either[ZuoraHolidayError, IssueData] = {
        for {
          ratePlanChargeData <- ratePlanChargeDataForDate(ratePlanChargeData, issueDate)
          billingPeriod <- ratePlanChargeData.billingSchedule.billingPeriodForDate(issueDate)
        } yield IssueData(issueDate, billingPeriod, ratePlanChargeData.issueCreditAmount)
      }
    }
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

  def ratePlanChargeDataForDate(ratePlanChargeData: List[RatePlanChargeData], date: LocalDate): Either[ZuoraHolidayError, RatePlanChargeData] = {
    ratePlanChargeData
      .find { ratePlanCharge =>
        ratePlanCharge.billingSchedule.isDateCoveredBySchedule(date) &&
          ratePlanCharge.issueDayOfWeek == date.getDayOfWeek
      }
      .toRight(
        ZuoraHolidayError(s"Subscription does not have a rate plan for date $date")
      )
  }
}
