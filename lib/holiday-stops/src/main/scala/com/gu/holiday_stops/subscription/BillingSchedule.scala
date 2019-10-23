package com.gu.holiday_stops.subscription

import java.time.{LocalDate, Period}

import cats.implicits._
import com.gu.holiday_stops.ZuoraHolidayError
import acyclic.skipped

import scala.annotation.tailrec

trait BillingSchedule {
  def billingPeriodForDate(date: LocalDate): Either[ZuoraHolidayError, BillingPeriod]
  def isDateCoveredBySchedule(date: LocalDate): Boolean
  def billingPeriodZuoraId: String
}

case class BillingPeriod(startDate: LocalDate, endDate: LocalDate) {
  def containsDate(date: LocalDate): Boolean =
    (date.isEqual(startDate) || date.isAfter(startDate)) &&
      date.isBefore(endDate)
}

object BillingSchedule {
  def forRatePlanCharge(ratePlanCharge: RatePlanCharge): Either[ZuoraHolidayError, BillingSchedule] =
    BillingSchedule(
      ratePlanCharge.billingPeriod,
      ratePlanCharge.specificBillingPeriod,
      ratePlanCharge.effectiveStartDate,
      ratePlanCharge.endDateCondition,
      ratePlanCharge.upToPeriodsType,
      ratePlanCharge.upToPeriods
    )

  def apply(
    optionalBillingPeriodId: Option[String],
    optionalSpecificBillingPeriod: Option[Int],
    effectiveStartDate: LocalDate,
    optionalEndDateCondition: Option[String],
    upToPeriodsType: Option[String],
    upToPeriods: Option[Int]
  ): Either[ZuoraHolidayError, BillingSchedule] = {

    for {
      endDateCondition <- optionalEndDateCondition.toRight(ZuoraHolidayError("RatePlanCharge.endDateCondition is required"))
      billingPeriodId <- optionalBillingPeriodId.toRight(ZuoraHolidayError("RatePlanCharge.billingPeriod is required"))
      billingPeriod <- billingPeriodForZuoraId(billingPeriodId: String, optionalSpecificBillingPeriod)
      ratePlanEndDate <- ratePlanEndDate(
        billingPeriod,
        effectiveStartDate,
        endDateCondition,
        upToPeriodsType,
        upToPeriods
      )
    } yield new BillingSchedule {
      override def isDateCoveredBySchedule(date: LocalDate): Boolean = {
        (date == effectiveStartDate | date.isAfter(effectiveStartDate)) &&
          ratePlanEndDate.map(date.isBefore(_)).getOrElse(true)
      }

      override def billingPeriodForDate(date: LocalDate): Either[ZuoraHolidayError, BillingPeriod] = {
        def billingPeriodByIndex(index: Int) = {
          val startDate = effectiveStartDate.plus(billingPeriod.multipliedBy(index))
          val endDate = startDate.plus(billingPeriod)
          BillingPeriod(startDate, endDate)
        }

        @tailrec
        def findNextBillingPeriodForDate(date: LocalDate, index: Int): Either[ZuoraHolidayError, BillingPeriod] = {
          val billingPeriod = billingPeriodByIndex(index)
          if (billingPeriod.startDate.isAfter(date)) {
            ZuoraHolidayError(s"Billing schedule does not cover date $date").asLeft
          } else {
            if (billingPeriod.endDate.isAfter(date)) {
              billingPeriodByIndex(index).asRight
            } else {
              findNextBillingPeriodForDate(date, index + 1)
            }
          }
        }

        findNextBillingPeriodForDate(date, 0)
      }

      override def billingPeriodZuoraId: String = billingPeriodId
    }
  }

  private def billingPeriodForZuoraId(zuoraBillingPeriodId: String, optionalSpecificBillingPeriod: Option[Int]): Either[ZuoraHolidayError, Period] = {
    zuoraBillingPeriodId match {
      case "Annual" => Right(Period.ofYears(1))
      case "Semi_Annual" => Right(Period.ofMonths(6))
      case "Quarter" => Right(Period.ofMonths(3))
      case "Month" => Right(Period.ofMonths(1))
      case "Specific_Weeks" =>
        optionalSpecificBillingPeriod
          .toRight(ZuoraHolidayError(s"specificBillingPeriod is required for $zuoraBillingPeriodId billing period"))
          .map(Period.ofWeeks(_))
      case _ => Left(ZuoraHolidayError(s"Failed to determine duration of billing period: $zuoraBillingPeriodId"))
    }
  }

  private def ratePlanEndDate(
    billingPeriod: Period,
    effectiveStartDate: LocalDate,
    endDateCondition: String,
    upToPeriodsType: Option[String],
    upToPeriods: Option[Int]
  ): Either[ZuoraHolidayError, Option[LocalDate]] = {
    endDateCondition match {
      case "Subscription_End" => Right(None) //This assumes all subscriptions will renew for ever
      case "Fixed_Period" =>
        ratePlanFixedPeriodEndDate(
          billingPeriod: Period,
          effectiveStartDate: LocalDate,
          endDateCondition: String,
          upToPeriodsType: Option[String],
          upToPeriods: Option[Int]
        ).map(endDate => Some(endDate))
    }
  }

  private def ratePlanFixedPeriodEndDate(
    billingPeriod: Period,
    effectiveStartDate: LocalDate,
    endDateCondition: String,
    optionalUpToPeriodsType: Option[String],
    optionalUpToPeriods: Option[Int]
  ) = {
    optionalUpToPeriodsType match {
      case Some("Billing_Periods") =>
        optionalUpToPeriods
          .toRight(ZuoraHolidayError("RatePlan.upToPeriods is required when RatePlan.upToPeriodsType=Billing_Periods"))
          .map(upToPeriods => effectiveStartDate.plus(billingPeriod.multipliedBy(upToPeriods)).minusDays(1))
      case unsupportedBillingPeriodType =>
        ZuoraHolidayError(s"RatePlan.upToPeriodsType=${unsupportedBillingPeriodType.getOrElse("null")} is not supported")
          .asLeft
    }
  }
}
