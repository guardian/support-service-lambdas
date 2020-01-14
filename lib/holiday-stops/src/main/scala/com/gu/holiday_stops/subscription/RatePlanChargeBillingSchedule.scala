package com.gu.holiday_stops.subscription

import java.time.temporal.{ChronoUnit, TemporalAdjusters}
import java.time.LocalDate

import cats.implicits._
import com.gu.holiday_stops.ZuoraHolidayError

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
  def billDatesCoveringDate(date: LocalDate): Either[ZuoraHolidayError, BillDates]

  def isDateCoveredBySchedule(date: LocalDate): Boolean
}

/**
 * Defines the dates for a billing period
 *
 * @param startDate inclusive start date of billing period
 * @param endDate   inclusive end date of billing period
 */
case class BillDates(startDate: LocalDate, endDate: LocalDate)

object RatePlanChargeBillingSchedule {

  def apply(
    subscription: Subscription,
    ratePlanCharge: RatePlanCharge,
    account: ZuoraAccount,
    useEffectiveStartDate: Boolean
  ): Either[ZuoraHolidayError, RatePlanChargeBillingSchedule] = {
    for {
      endDateCondition <- ratePlanCharge.endDateCondition.toRight(ZuoraHolidayError("RatePlanCharge.endDateCondition is required"))
      billingPeriodName <- ratePlanCharge.billingPeriod.toRight(ZuoraHolidayError("RatePlanCharge.billingPeriod is required"))
      billingPeriod <- billingPeriodForName(billingPeriodName, ratePlanCharge.specificBillingPeriod)
      ratePlanStartDate <- ratePlanStartDate(
        subscription.customerAcceptanceDate,
        ratePlanCharge.billingDay,
        ratePlanCharge.triggerEvent,
        ratePlanCharge.triggerDate,
        ratePlanCharge.processedThroughDate,
        account.billingAndPayment.billCycleDay,
        ratePlanCharge.effectiveStartDate,
        useEffectiveStartDate
      )
      ratePlanEndDate <- ratePlanEndDate(
        billingPeriod,
        ratePlanStartDate,
        endDateCondition,
        ratePlanCharge.upToPeriodsType,
        ratePlanCharge.upToPeriods
      )
    } yield new RatePlanChargeBillingSchedule {
      override def isDateCoveredBySchedule(date: LocalDate): Boolean = {
        (date == ratePlanStartDate || date.isAfter(ratePlanStartDate)) &&
          ratePlanEndDate
          .map(endDate => date == endDate || date.isBefore(endDate))
          .getOrElse(true)
      }

      override def billDatesCoveringDate(date: LocalDate): Either[ZuoraHolidayError, BillDates] = {
        if (isDateCoveredBySchedule(date)) {
          val startPeriods = billingPeriod
            .unit
            .between(ratePlanStartDate, date) / billingPeriod.multiple
          val startDate = ratePlanStartDate
            .plus(startPeriods * billingPeriod.multiple, billingPeriod.unit)
          val endDate = startDate
            .plus(billingPeriod.multiple, billingPeriod.unit)
            .minusDays(1)

          BillDates(startDate, endDate).asRight
        } else {
          ZuoraHolidayError(s"Billing schedule does not cover date $date").asLeft
        }
      }
    }
  }

  private def billingPeriodForName(
    billingPeriodName: String,
    optionalSpecificBillingPeriod: Option[Int]
  ): Either[ZuoraHolidayError, BillingPeriod] = {
    billingPeriodName match {
      case "Annual" => Right(BillingPeriod(ChronoUnit.YEARS, 1))
      case "Semi_Annual" => Right(BillingPeriod(ChronoUnit.MONTHS, 6))
      case "Quarter" => Right(BillingPeriod(ChronoUnit.MONTHS, 3))
      case "Month" => Right(BillingPeriod(ChronoUnit.MONTHS, 1))
      case "Specific_Weeks" =>
        optionalSpecificBillingPeriod
          .toRight(ZuoraHolidayError(s"specificBillingPeriod is required for $billingPeriodName billing period"))
          .map(BillingPeriod(ChronoUnit.WEEKS, _))
      case "Specific_Months" =>
        optionalSpecificBillingPeriod
          .toRight(ZuoraHolidayError(s"specificBillingPeriod is required for $billingPeriodName billing period"))
          .map(BillingPeriod(ChronoUnit.MONTHS, _))
      case _ => Left(ZuoraHolidayError(s"Failed to determine duration of billing period: $billingPeriodName"))
    }
  }

  private def ratePlanEndDate(
    billingPeriod: BillingPeriod,
    ratePlanStartDate: LocalDate,
    endDateCondition: String,
    upToPeriodsType: Option[String],
    upToPeriods: Option[Int]
  ): Either[ZuoraHolidayError, Option[LocalDate]] = {
    endDateCondition match {
      case "Subscription_End" => Right(None) //This assumes all subscriptions will renew for ever
      case "Fixed_Period" =>
        ratePlanFixedPeriodEndDate(
          billingPeriod,
          ratePlanStartDate,
          endDateCondition,
          upToPeriodsType,
          upToPeriods
        ).map(endDate => Some(endDate))
    }
  }

  private def ratePlanStartDate(
    customerAcceptanceDate: LocalDate,
    optionalBillingDay: Option[String],
    optionalTriggerEvent: Option[String],
    optionalTriggerDate: Option[LocalDate],
    processedThroughDate: Option[LocalDate],
    billCycleDay: Int,
    effectiveStartDate: LocalDate,
    useEffectiveStartDate: Boolean
  ): Either[ZuoraHolidayError, LocalDate] = {
    if (useEffectiveStartDate) {
      effectiveStartDate.asRight
    } else {
      optionalBillingDay match {
        case None | Some("ChargeTriggerDay") => ratePlanTriggerDate(
          optionalTriggerEvent,
          optionalTriggerDate,
          customerAcceptanceDate
        )
        case Some("DefaultFromCustomer") =>
          for {
            triggerDate <- ratePlanTriggerDate(
              optionalTriggerEvent,
              optionalTriggerDate,
              customerAcceptanceDate
            )
          } yield adjustDateForBillCycleDate(triggerDate, billCycleDay)

        case Some(unsupported) =>
          ZuoraHolidayError(s"RatePlanCharge.billingDay = $unsupported is not supported").asLeft
      }
    }
  }

  private def adjustDateForBillCycleDate(date: LocalDate, billCycleDay: Int): LocalDate = {
    val lastDayOfMonth = date `with` TemporalAdjusters.lastDayOfMonth()
    val startDateWithBillCycleDate =
      if (lastDayOfMonth.getDayOfMonth < billCycleDay) {
        lastDayOfMonth
      } else {
        lastDayOfMonth.withDayOfMonth(billCycleDay)
      }
    if (startDateWithBillCycleDate.isBefore(date)) {
      startDateWithBillCycleDate.plusMonths(1)
    } else {
      startDateWithBillCycleDate
    }
  }

  private def ratePlanTriggerDate(
    optionalTriggerEvent: Option[String],
    optionalTriggerDate: Option[LocalDate],
    customerAcceptanceDate: LocalDate
  ): Either[ZuoraHolidayError, LocalDate] = {
    optionalTriggerEvent match {
      case Some("CustomerAcceptance") => Right(customerAcceptanceDate)
      case Some("SpecificDate") =>
        optionalTriggerDate
          .toRight(ZuoraHolidayError("RatePlan.triggerDate is required when RatePlan.triggerEvent=SpecificDate"))
      case None =>
        ZuoraHolidayError("RatePlan.triggerEvent is a required field")
          .asLeft
    }
  }

  private def ratePlanFixedPeriodEndDate(
    billingPeriod: BillingPeriod,
    ratePlanStartDate: LocalDate,
    endDateCondition: String,
    optionalUpToPeriodsType: Option[String],
    optionalUpToPeriods: Option[Int]
  ) = {
    optionalUpToPeriodsType match {
      case Some("Billing_Periods") =>
        optionalUpToPeriods
          .toRight(ZuoraHolidayError("RatePlan.upToPeriods is required when RatePlan.upToPeriodsType=Billing_Periods"))
          .map { upToPeriods =>
            billingPeriod
              .unit
              .addTo(ratePlanStartDate, upToPeriods * billingPeriod.multiple)
              .minusDays(1)
          }
      case unsupportedBillingPeriodType =>
        ZuoraHolidayError(s"RatePlan.upToPeriodsType=${unsupportedBillingPeriodType.getOrElse("null")} is not supported")
          .asLeft
    }
  }

  case class BillingPeriod(unit: ChronoUnit, multiple: Int)
}
