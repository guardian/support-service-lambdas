package com.gu.holiday_stops.subscription

import java.time.{LocalDate, Period}

import cats.implicits._
import com.gu.holiday_stops.ZuoraHolidayError
import acyclic.skipped

import scala.annotation.tailrec

/**
 * Information about the billing cycles for a Zuora RatePlanCharge.
 *
 * This class uses fields from the Zuora RatePlanCharge to predict for what period a rate plan is valid for, and
 * the start and end of each billing period.
 *
 * This class is not comprehensive and will only work for RatePlanCharges with a limited set of configurations as follows.
 *
 * Billing Periods
 * ---------------
 *
 * The billing periods are calculated using RatePlanCharge.effectiveStartDate as a starting point.
 * RatePlanCharge.billingPeriod is used to derive the length of each billing cycle. These are projected into
 * the future until the RatePlanCharge reaches its endpoint.
 *
 * RatePlanCharge termination
 * --------------------------
 *
 * The point in time at which the ratePlanCharge terminates is derived as follows:
 *
 * RatePlanCharge.endDateCondition = 'Subscription_End'
 * ----------------------------------------------------
 * This derives the end point of the RatePlanCharge from the end of the subscription. We currently assume all
 * subscriptions do not terminate, hence these rate plans run for ever.
 *
 * RatePlanCharge.endDateCondition = 'Fixed_Period'
 * ------------------------------------------------
 * This indicates that the end of the rate plan is derived based on the upToPeriodsType field. See below for details
 *
 * - RatePlanCharge.upToPeriodsType = 'Billing_Periods'
 * This field/value combination indicates the rate plan end is based on a fixed number of Billing Periods defined by
 * the RatePlanCharge.upToPeriods field
 *
 *
 * No other values in these fields are supported attempting to create a billing schedule for those RatePlanCharges will
 * return an error.
 *
 * For more information see:
 * https://knowledgecenter.zuora.com/DC_Developers/G_SOAP_API/E1_SOAP_API_Object_Reference/ProductRatePlanCharge
 */
trait RatePlanChargeBillingSchedule {
  def billingPeriodForDate(date: LocalDate): Either[ZuoraHolidayError, BillingPeriod]

  def isDateCoveredBySchedule(date: LocalDate): Boolean
}

/**
 * Defines the dates for a billing period
 *
 * @param startDate inclusive start date of billing period
 * @param endDate   inclusive end date of billing period
 */
case class BillingPeriod(startDate: LocalDate, endDate: LocalDate)

object RatePlanChargeBillingSchedule {
  def apply(ratePlanCharge: RatePlanCharge): Either[ZuoraHolidayError, RatePlanChargeBillingSchedule] = {
    for {
      endDateCondition <- ratePlanCharge.endDateCondition.toRight(ZuoraHolidayError("RatePlanCharge.endDateCondition is required"))
      billingPeriodId <- ratePlanCharge.billingPeriod.toRight(ZuoraHolidayError("RatePlanCharge.billingPeriod is required"))
      billingPeriod <- billingPeriodForZuoraId(billingPeriodId, ratePlanCharge.specificBillingPeriod)
      ratePlanEndDate <- ratePlanEndDate(
        billingPeriod,
        ratePlanCharge.effectiveStartDate,
        endDateCondition,
        ratePlanCharge.upToPeriodsType,
        ratePlanCharge.upToPeriods
      )
    } yield new RatePlanChargeBillingSchedule {
      override def isDateCoveredBySchedule(date: LocalDate): Boolean = {
        (date == ratePlanCharge.effectiveStartDate || date.isAfter(ratePlanCharge.effectiveStartDate)) &&
          ratePlanEndDate
          .map(endDate => date == endDate || date.isBefore(endDate))
          .getOrElse(true)
      }

      override def billingPeriodForDate(date: LocalDate): Either[ZuoraHolidayError, BillingPeriod] = {
        def billingPeriodByIndex(index: Int) = {
          val startDate = ratePlanCharge.effectiveStartDate.plus(billingPeriod.multipliedBy(index))
          val endDate = startDate.plus(billingPeriod).minusDays(1)
          BillingPeriod(startDate, endDate)
        }

        @tailrec
        def findBillingPeriodForDate(date: LocalDate, index: Int): Either[ZuoraHolidayError, BillingPeriod] = {
          val billingPeriod = billingPeriodByIndex(index)
          if (billingPeriod.startDate.isAfter(date) ||
            ratePlanEndDate.map(endDate => date.isAfter(endDate)).getOrElse(false)) {
            ZuoraHolidayError(s"Billing schedule does not cover date $date").asLeft
          } else {
            if (billingPeriod.endDate.isAfter(date) || billingPeriod.endDate == date) {
              billingPeriodByIndex(index).asRight
            } else {
              findBillingPeriodForDate(date, index + 1)
            }
          }
        }

        findBillingPeriodForDate(date, 0)
      }
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
          billingPeriod,
          effectiveStartDate,
          endDateCondition,
          upToPeriodsType,
          upToPeriods
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
          .map { upToPeriods =>
            effectiveStartDate
              .plus(billingPeriod.multipliedBy(upToPeriods))
              .minusDays(1)
          }
      case unsupportedBillingPeriodType =>
        ZuoraHolidayError(s"RatePlan.upToPeriodsType=${unsupportedBillingPeriodType.getOrElse("null")} is not supported")
          .asLeft
    }
  }
}
