package com.gu.holiday_stops.subscription

import java.time.temporal.TemporalAdjusters
import java.time.{DayOfWeek, LocalDate}

import com.gu.holiday_stops.ZuoraHolidayError

import scala.annotation.tailrec
import scala.math.BigDecimal.RoundingMode

case class RatePlanChargeData(
  ratePlanCharge: RatePlanCharge,
  billingSchedule: RatePlanChargeBillingSchedule,
  billingPeriodName: String,
  issueDayOfWeek: DayOfWeek,
  issueCreditAmount: Double
) {
  def getIssuesForPeriod(startDateInclusive: LocalDate, endDateInclusive: LocalDate): List[IssueData] = {
    @tailrec
    def getIssuesForPeriod(firstIssueDate: LocalDate, endDateInclusive: LocalDate, issueData: List[IssueData]): List[IssueData] = {
      if (firstIssueDate.isAfter(endDateInclusive)) {
        issueData
      } else {
        getIssuesForPeriod(
          firstIssueDate.`with`(TemporalAdjusters.next(issueDayOfWeek)),
          endDateInclusive,
          billingSchedule.billDatesCoveringDate(firstIssueDate) match {
            case Left(_) => issueData
            case Right(billingPeriod) => IssueData(firstIssueDate, billingPeriod, issueCreditAmount) :: issueData
          }
        )
      }
    }

    getIssuesForPeriod(
      startDateInclusive.`with`(TemporalAdjusters.nextOrSame(issueDayOfWeek)),
      endDateInclusive,
      Nil
    )
  }
}

object RatePlanChargeData {
  def apply(subscription: Subscription, ratePlanCharge: RatePlanCharge, issueDayOfWeek: DayOfWeek): Either[ZuoraHolidayError, RatePlanChargeData] = {
    for {
      billingPeriodName <- ratePlanCharge
        .billingPeriod
        .toRight(ZuoraHolidayError("RatePlanCharge.billingPeriod is required"))
      schedule <- RatePlanChargeBillingSchedule(subscription, ratePlanCharge)
      issueCreditAmount <- calculateIssueCreditAmount(ratePlanCharge)
    } yield RatePlanChargeData(ratePlanCharge, schedule, billingPeriodName, issueDayOfWeek, issueCreditAmount)
  }

  private def calculateIssueCreditAmount(ratePlanCharge: RatePlanCharge) = {
    def roundUp(d: Double): Double = BigDecimal(d).setScale(2, RoundingMode.UP).toDouble

    for {
      billingPeriodName <- ratePlanCharge
        .billingPeriod
        .toRight(ZuoraHolidayError("RatePlanCharge.billingPeriod is required"))
      approximateBillingPeriodWeeks <- approximateBillingPeriodWeeksForName(billingPeriodName, ratePlanCharge.specificBillingPeriod)
      price = -roundUp(ratePlanCharge.price / approximateBillingPeriodWeeks)
    } yield price
  }

  private def approximateBillingPeriodWeeksForName(
    billingPeriodName: String,
    optionalSpecificBillingPeriod: Option[Int]
  ): Either[ZuoraHolidayError, Int] = {
    billingPeriodName match {
      case "Annual" => Right(52)
      case "Semi_Annual" => Right(26)
      case "Quarter" => Right(13)
      case "Month" => Right(4)
      case "Specific_Weeks" =>
        optionalSpecificBillingPeriod
          .toRight(ZuoraHolidayError(s"specificBillingPeriod is required for $billingPeriodName billing period"))
      case "Specific_Months" =>
        optionalSpecificBillingPeriod
          .toRight(ZuoraHolidayError(s"specificBillingPeriod is required for $billingPeriodName billing period"))
          .map(numberOfMonths => numberOfMonths * 4)
      case _ => Left(ZuoraHolidayError(s"Failed to determine duration of billing period: $billingPeriodName"))
    }
  }
}

