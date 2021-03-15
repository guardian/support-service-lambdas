package com.gu.zuora.subscription

import java.time.temporal.TemporalAdjusters
import java.time.{DayOfWeek, LocalDate}

import scala.annotation.tailrec
import scala.math.BigDecimal.RoundingMode

case class RatePlanChargeData(
  ratePlanCharge: RatePlanCharge,
  billingSchedule: RatePlanChargeBillingSchedule,
  billingPeriodName: String,
  issueDayOfWeek: DayOfWeek,
  issueCreditAmount: Double
)

object RatePlanChargeData {
  def apply(
    subscription: Subscription,
    ratePlanCharge: RatePlanCharge,
    account: ZuoraAccount,
    issueDayOfWeek: DayOfWeek,
  ): Either[ZuoraApiFailure, RatePlanChargeData] = {
    for {
      billingPeriodName <- ratePlanCharge
        .billingPeriod
        .toRight(ZuoraApiFailure("RatePlanCharge.billingPeriod is required"))
      schedule <- RatePlanChargeBillingSchedule(subscription, ratePlanCharge, account)
      issueCreditAmount <- calculateIssueCreditAmount(ratePlanCharge)
    } yield RatePlanChargeData(ratePlanCharge, schedule, billingPeriodName, issueDayOfWeek, issueCreditAmount)
  }

  private def calculateIssueCreditAmount(ratePlanCharge: RatePlanCharge) = {
    for {
      billingPeriodName <- ratePlanCharge
        .billingPeriod
        .toRight(ZuoraApiFailure("RatePlanCharge.billingPeriod is required"))
      approximateBillingPeriodWeeks <- approximateBillingPeriodWeeksForName(billingPeriodName, ratePlanCharge.specificBillingPeriod)
      roundedCredit = -round2Places(ratePlanCharge.price / approximateBillingPeriodWeeks)
    } yield {
      roundedCredit
    }
  }

  def round2Places(d: Double): Double = BigDecimal(d).setScale(2, RoundingMode.UP).toDouble

  private def approximateBillingPeriodWeeksForName(
    billingPeriodName: String,
    optionalSpecificBillingPeriod: Option[Int]
  ): Either[ZuoraApiFailure, Int] = {
    billingPeriodName match {
      case "Annual" => Right(52)
      case "Semi_Annual" => Right(26)
      case "Quarter" => Right(13)
      case "Month" => Right(4)
      case "Specific_Weeks" =>
        optionalSpecificBillingPeriod
          .toRight(ZuoraApiFailure(s"specificBillingPeriod is required for $billingPeriodName billing period"))
      case "Specific_Months" =>
        optionalSpecificBillingPeriod
          .toRight(ZuoraApiFailure(s"specificBillingPeriod is required for $billingPeriodName billing period"))
          .map(numberOfMonths => numberOfMonths * 4)
      case _ => Left(ZuoraApiFailure(s"Failed to determine duration of billing period: $billingPeriodName"))
    }
  }
}
