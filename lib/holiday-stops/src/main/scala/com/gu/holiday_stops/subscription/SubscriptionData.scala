package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.{ZuoraHolidayError, ZuoraHolidayResponse}
import cats.implicits._

case class IssueData(issueDate: LocalDate, billingPeriod: BillingPeriod, credit: Double) {
  /**
   * This returns the date for the next bill after the stoppedPublicationDate.
   *
   * This currently calculates the current billing period and uses the following day. This is an over simplification
   * but works for current use cases
   *
   * For more details about the calculation of the current billing period see:
   *
   * [[com.gu.holiday_stops.subscription.RatePlanChargeBillingSchedule]]
   *
   * @return Date of the first day of the billing period
   *         following this <code>stoppedPublicationDate</code>.
   *         [[com.gu.holiday_stops.subscription.StoppedProductTest]]
   *         shows examples of the expected outcome.
   */
  def nextBillingPeriodStartDate: LocalDate = {
    billingPeriod.endDate.plusDays(1)
  }
}

trait SubscriptionData {
  def issueDataForDate(issueDate: LocalDate): Either[ZuoraHolidayError, IssueData]
  def issueDataForPeriod(startDateInclusive: LocalDate, endDateInclusive: LocalDate): List[IssueData]
}
object SubscriptionData {
  def apply(subscription: Subscription): Either[ZuoraHolidayError, SubscriptionData] = {
    val supportedRatePlanCharges: List[(RatePlanCharge, SupportedRatePlanCharge)] = for {
      ratePlan <- subscription.ratePlans
      supportedProduct <- getSupportedProductForRatePlan(ratePlan).toList
      supportedRatePlan <- getSupportedRatePlanForRatePlan(ratePlan, supportedProduct).toList
      unExpiredRatePlanCharge <- getUnexpiredRatePlanCharges(ratePlan)
      supportedRatePlanCharge <- getSupportedRatePlanCharge(supportedRatePlan, unExpiredRatePlanCharge)
    } yield (unExpiredRatePlanCharge, supportedRatePlanCharge)

    for {
      ratePlanChargeDatas <- supportedRatePlanCharges
        .traverse[ZuoraHolidayResponse, RatePlanChargeData] {
          case (ratePlanCharge, supportedRatePlanCharge) =>
            RatePlanChargeData(ratePlanCharge, supportedRatePlanCharge.dayOfWeek)
        }
      nonZeroRatePlanChargeDatas = ratePlanChargeDatas.filter { ratePlanChargeData =>
        ratePlanChargeData.issueCreditAmount != 0
      }
    } yield createSubscriptionData(nonZeroRatePlanChargeDatas)
  }

  private def createSubscriptionData(nonZeroRatePlanChargeDatas: List[RatePlanChargeData]) = {
    new SubscriptionData {
      def issueDataForDate(issueDate: LocalDate): Either[ZuoraHolidayError, IssueData] = {
        for {
          ratePlanChargeData <- ratePlanChargeDataForDate(nonZeroRatePlanChargeDatas, issueDate)
          billingPeriod <- ratePlanChargeData.billingSchedule.billingPeriodForDate(issueDate)
        } yield IssueData(issueDate, billingPeriod, ratePlanChargeData.issueCreditAmount)
      }

      def issueDataForPeriod(startDateInclusive: LocalDate, endDateInclusive: LocalDate): List[IssueData] = {
        nonZeroRatePlanChargeDatas
          .flatMap(_.getIssuesForPeriod(startDateInclusive, endDateInclusive))
          .sortBy(_.issueDate)(Ordering.fromLessThan(_.isBefore(_)))
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
