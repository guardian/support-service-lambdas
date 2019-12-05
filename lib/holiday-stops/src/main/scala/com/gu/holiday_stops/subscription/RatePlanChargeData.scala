package com.gu.holiday_stops.subscription

import java.time.DayOfWeek

import com.gu.holiday_stops.ZuoraHolidayError
import acyclic.skipped
import scala.math.BigDecimal.RoundingMode

case class RatePlanChargeData(
  ratePlanCharge: RatePlanCharge,
  billingSchedule: RatePlanChargeBillingSchedule,
  billingPeriodName: String,
  issueDayOfWeek: DayOfWeek,
  issueCreditAmount: Double
)

object RatePlanChargeData {
  def apply(ratePlanCharge: RatePlanCharge, issueDayOfWeek: DayOfWeek): Either[ZuoraHolidayError, RatePlanChargeData] = {
    for {
      billingPeriodName <- ratePlanCharge
        .billingPeriod
        .toRight(ZuoraHolidayError("RatePlanCharge.billingPeriod is required"))
      schedule <- RatePlanChargeBillingSchedule(ratePlanCharge)
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
      case _ => Left(ZuoraHolidayError(s"Failed to determine duration of billing period: $billingPeriodName"))
    }
  }
}

