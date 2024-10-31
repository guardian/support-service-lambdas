package com.gu.zuora.subscription

import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.time.temporal.{ChronoUnit, TemporalAdjusters}
import java.time.LocalDate

import cats.data.NonEmptyList
import cats.syntax.all._

import scala.annotation.tailrec

/** Information about the billing cycles for a Zuora RatePlanCharge.
  *
  * This class uses fields from the Zuora RatePlanCharge to predict for what period a rate plan is valid for, and the
  * start and end of each billing period.
  *
  * This class is not comprehensive and will only work for RatePlanCharges with a limited set of configurations as
  * follows.
  *
  * Billing Periods ---------------
  *
  * The billing periods are calculated using RatePlanCharge.effectiveStartDate as a starting point.
  * RatePlanCharge.billingPeriod is used to derive the length of each billing cycle. These are projected into the future
  * until the RatePlanCharge reaches its endpoint.
  *
  * RatePlanCharge termination --------------------------
  *
  * The point in time at which the ratePlanCharge terminates is derived as follows:
  *
  * RatePlanCharge.endDateCondition = 'Subscription_End' ---------------------------------------------------- This
  * derives the end point of the RatePlanCharge from the end of the subscription. We currently assume all subscriptions
  * do not terminate, hence these rate plans run for ever.
  *
  * RatePlanCharge.endDateCondition = 'Fixed_Period' ------------------------------------------------ This indicates
  * that the end of the rate plan is derived based on the upToPeriodsType field. See below for details
  *
  *   - RatePlanCharge.upToPeriodsType = 'Billing_Periods' This field/value combination indicates the rate plan end is
  *     based on a fixed number of Billing Periods defined by the RatePlanCharge.upToPeriods field
  *
  * No other values in these fields are supported attempting to create a billing schedule for those RatePlanCharges will
  * return an error.
  *
  * For more information see:
  * https://knowledgecenter.zuora.com/DC_Developers/G_SOAP_API/E1_SOAP_API_Object_Reference/ProductRatePlanCharge
  */
trait RatePlanChargeBillingSchedule {
  def billDatesCoveringDate(date: LocalDate): Either[ZuoraApiFailure, BillDates]

  def isDateCoveredBySchedule(date: LocalDate): Boolean
}

/** Defines the dates for a billing period
  *
  * @param startDate
  *   inclusive start date of billing period
  * @param endDate
  *   inclusive end date of billing period
  */
case class BillDates(startDate: LocalDate, endDate: LocalDate)

object RatePlanChargeBillingSchedule {
  def apply(
      subscription: Subscription,
      ratePlanCharge: RatePlanCharge,
      account: ZuoraAccount,
  ): Either[ZuoraApiFailure, RatePlanChargeBillingSchedule] = {
    apply(
      subscription.customerAcceptanceDate,
      subscription.contractEffectiveDate,
      ratePlanCharge.billingDay,
      ratePlanCharge.triggerEvent,
      ratePlanCharge.triggerDate,
      ratePlanCharge.processedThroughDate,
      ratePlanCharge.chargedThroughDate,
      account.billingAndPayment.billCycleDay,
      ratePlanCharge.upToPeriodsType,
      ratePlanCharge.upToPeriods,
      ratePlanCharge.billingPeriod,
      ratePlanCharge.specificBillingPeriod,
      ratePlanCharge.endDateCondition,
      ratePlanCharge.effectiveStartDate,
    )
  }

  private def apply(
      customerAcceptanceDate: LocalDate,
      contractEffectiveDate: LocalDate,
      billingDay: Option[String],
      triggerEvent: Option[String],
      triggerDate: Option[LocalDate],
      processedThroughDate: Option[LocalDate],
      chargedThroughDate: Option[LocalDate],
      billCycleDay: Int,
      upToPeriodType: Option[String],
      upToPeriods: Option[Int],
      optionalBillingPeriodName: Option[String],
      specificBillingPeriod: Option[Int],
      endDateCondition: Option[String],
      effectiveStartDate: LocalDate,
  ): Either[ZuoraApiFailure, RatePlanChargeBillingSchedule] = {
    for {
      endDateCondition <- endDateCondition.toRight(ZuoraApiFailure("RatePlanCharge.endDateCondition is required"))
      billingPeriodName <- optionalBillingPeriodName.toRight(
        ZuoraApiFailure("RatePlanCharge.billingPeriod is required"),
      )
      billingPeriod <- billingPeriodForName(billingPeriodName, specificBillingPeriod)

      calculatedRatePlanStartDate <- ratePlanStartDate(
        customerAcceptanceDate,
        contractEffectiveDate,
        billingDay,
        triggerEvent,
        triggerDate,
        processedThroughDate,
        billCycleDay,
      )

      calculatedRatePlanEndDate <- ratePlanEndDate(
        billingPeriod,
        calculatedRatePlanStartDate,
        endDateCondition,
        upToPeriodType,
        upToPeriods,
      )

      scheduleForCalculatedStartDate = RatePlanChargeBillingSchedule(
        calculatedRatePlanStartDate,
        calculatedRatePlanEndDate,
        billingPeriod,
      )

      endDateBasedOnEffectiveStartDate <- ratePlanEndDate(
        billingPeriod,
        effectiveStartDate,
        endDateCondition,
        upToPeriodType,
        upToPeriods,
      )

      scheduleForEffectiveStartDate = RatePlanChargeBillingSchedule(
        effectiveStartDate,
        endDateBasedOnEffectiveStartDate,
        billingPeriod,
      )

      billingSchedule <- selectScheduleThatPredictsProcessedThroughDate(
        NonEmptyList.of(
          scheduleForCalculatedStartDate,
          scheduleForEffectiveStartDate,
        ),
        processedThroughDate,
      )
    } yield billingSchedule
  }

  private def apply(
      ratePlanStartDate: LocalDate,
      ratePlanEndDate: Option[LocalDate],
      billingPeriod: BillingPeriod,
  ): RatePlanChargeBillingSchedule = {
    new RatePlanChargeBillingSchedule {
      override def isDateCoveredBySchedule(date: LocalDate): Boolean = {
        (date == ratePlanStartDate || date.isAfter(ratePlanStartDate)) &&
        ratePlanEndDate
          .map(endDate => date == endDate || date.isBefore(endDate))
          .getOrElse(true)
      }

      override def billDatesCoveringDate(date: LocalDate): Either[ZuoraApiFailure, BillDates] = {
        if (isDateCoveredBySchedule(date)) {
          billDatesCoveringDate(date, ratePlanStartDate, 0)
        } else {
          ZuoraApiFailure(s"Billing schedule does not cover date $date").asLeft
        }
      }

      @tailrec
      private def billDatesCoveringDate(
          date: LocalDate,
          startDate: LocalDate,
          billingPeriodIndex: Int,
      ): Either[ZuoraApiFailure, BillDates] = {
        val currentPeriod = BillDates(
          startDate.plus(billingPeriod.multiple.toLong * billingPeriodIndex, billingPeriod.unit),
          startDate.plus(billingPeriod.multiple.toLong * (billingPeriodIndex + 1), billingPeriod.unit).minusDays(1),
        )

        if (currentPeriod.startDate.isAfter(date)) {
          ZuoraApiFailure(s"Billing schedule does not cover date $date").asLeft
        } else if (!currentPeriod.endDate.isBefore(date)) {
          currentPeriod.asRight
        } else {
          billDatesCoveringDate(date, startDate, billingPeriodIndex + 1)
        }
      }
    }
  }

  private def selectScheduleThatPredictsProcessedThroughDate(
      schedules: NonEmptyList[RatePlanChargeBillingSchedule],
      optionalProcessedThroughDate: Option[LocalDate],
  ): Either[ZuoraApiFailure, RatePlanChargeBillingSchedule] = {
    optionalProcessedThroughDate match {
      case Some(processedThroughDate) =>
        schedules
          .find { schedule =>
            val processThoughDateIsAtStartOfBillingSchedule = schedule
              .billDatesCoveringDate(processedThroughDate)
              .map(_.startDate == processedThroughDate)
              .getOrElse(false)

            val dayBeforeProcessedThroughDate = processedThroughDate.minusDays(1)
            val processThoughDateIsJustAfterEndOfBillingSchedule = schedule
              .billDatesCoveringDate(dayBeforeProcessedThroughDate)
              .map(_.endDate == dayBeforeProcessedThroughDate)
              .getOrElse(false)

            processThoughDateIsAtStartOfBillingSchedule || processThoughDateIsJustAfterEndOfBillingSchedule
          }
          .toRight(
            ZuoraApiFailure(
              s"Could not create schedule that correctly predicts processed through date $processedThroughDate",
            ),
          )
      case None =>
        schedules.head.asRight
    }
  }

  private def billingPeriodForName(
      billingPeriodName: String,
      optionalSpecificBillingPeriod: Option[Int],
  ): Either[ZuoraApiFailure, BillingPeriod] = {
    billingPeriodName match {
      case "Annual" => Right(BillingPeriod(ChronoUnit.YEARS, 1))
      case "Semi_Annual" | "Semi-Annual" => Right(BillingPeriod(ChronoUnit.MONTHS, 6))
      case "Quarter" => Right(BillingPeriod(ChronoUnit.MONTHS, 3))
      case "Month" => Right(BillingPeriod(ChronoUnit.MONTHS, 1))
      case "Specific_Weeks" | "Specific Weeks" =>
        optionalSpecificBillingPeriod
          .toRight(ZuoraApiFailure(s"specificBillingPeriod is required for $billingPeriodName billing period"))
          .map(BillingPeriod(ChronoUnit.WEEKS, _))
      case "Specific_Months" | "Specific Months" =>
        optionalSpecificBillingPeriod
          .toRight(ZuoraApiFailure(s"specificBillingPeriod is required for $billingPeriodName billing period"))
          .map(BillingPeriod(ChronoUnit.MONTHS, _))
      case _ => Left(ZuoraApiFailure(s"Failed to determine duration of billing period: $billingPeriodName"))
    }
  }

  private def ratePlanEndDate(
      billingPeriod: BillingPeriod,
      ratePlanStartDate: LocalDate,
      endDateCondition: String,
      upToPeriodsType: Option[String],
      upToPeriods: Option[Int],
  ): Either[ZuoraApiFailure, Option[LocalDate]] = {
    endDateCondition match {
      case "Subscription_End" | "SubscriptionEnd" => Right(None) // This assumes all subscriptions will renew for ever
      case "Fixed_Period" | "FixedPeriod" =>
        ratePlanFixedPeriodEndDate(
          billingPeriod,
          ratePlanStartDate,
          endDateCondition,
          upToPeriodsType,
          upToPeriods,
        ).map(endDate => Some(endDate))
      case unsupported =>
        ZuoraApiFailure(s"RatePlanCharge.endDateCondition=$unsupported is not supported").asLeft
    }
  }

  private def ratePlanStartDate(
      customerAcceptanceDate: LocalDate,
      contractEffectiveDate: LocalDate,
      optionalBillingDay: Option[String],
      optionalTriggerEvent: Option[String],
      optionalTriggerDate: Option[LocalDate],
      processedThroughDate: Option[LocalDate],
      billCycleDay: Int,
  ): Either[ZuoraApiFailure, LocalDate] = {
    optionalBillingDay match {
      case None | Some("ChargeTriggerDay") =>
        ratePlanTriggerDate(
          optionalTriggerEvent,
          optionalTriggerDate,
          customerAcceptanceDate,
          contractEffectiveDate,
        )
      case Some("DefaultFromCustomer") =>
        for {
          triggerDate <- ratePlanTriggerDate(
            optionalTriggerEvent,
            optionalTriggerDate,
            customerAcceptanceDate,
            contractEffectiveDate,
          )
        } yield adjustDateForBillCycleDate(triggerDate, billCycleDay)

      case Some(unsupported) =>
        ZuoraApiFailure(s"RatePlanCharge.billingDay = $unsupported is not supported").asLeft
    }
  }

  private def adjustDateForBillCycleDate(date: LocalDate, billCycleDay: Int): LocalDate = {
    val dateWithCorrectMonth = if (date.getDayOfMonth < billCycleDay) {
      date.plusMonths(1)
    } else {
      date
    }

    val lastDateOfMonth = dateWithCorrectMonth `with` TemporalAdjusters.lastDayOfMonth()

    dateWithCorrectMonth.withDayOfMonth(Math.min(lastDateOfMonth.getDayOfMonth, billCycleDay))
  }

  private def ratePlanTriggerDate(
      optionalTriggerEvent: Option[String],
      optionalTriggerDate: Option[LocalDate],
      customerAcceptanceDate: LocalDate,
      contractEffectiveDate: LocalDate,
  ): Either[ZuoraApiFailure, LocalDate] = {
    optionalTriggerEvent match {
      case Some("CustomerAcceptance") => Right(customerAcceptanceDate)
      case Some("ContractEffective") => Right(contractEffectiveDate)
      case Some("SpecificDate") =>
        optionalTriggerDate
          .toRight(ZuoraApiFailure("RatePlan.triggerDate is required when RatePlan.triggerEvent=SpecificDate"))
      case Some(unsupported) =>
        ZuoraApiFailure(s"RatePlan.triggerEvent=$unsupported is not supported").asLeft
      case None =>
        ZuoraApiFailure("RatePlan.triggerEvent is a required field").asLeft
    }
  }

  private def ratePlanFixedPeriodEndDate(
      billingPeriod: BillingPeriod,
      ratePlanStartDate: LocalDate,
      endDateCondition: String,
      optionalUpToPeriodsType: Option[String],
      optionalUpToPeriods: Option[Int],
  ) = {
    optionalUpToPeriodsType match {
      case Some("Billing_Periods") | Some("Billing Periods") =>
        optionalUpToPeriods
          .toRight(ZuoraApiFailure("RatePlan.upToPeriods is required when RatePlan.upToPeriodsType=Billing_Periods"))
          .map { upToPeriods =>
            billingPeriod.unit
              .addTo(ratePlanStartDate, (upToPeriods * billingPeriod.multiple).toLong)
              .minusDays(1)
          }
      case unsupportedBillingPeriodType =>
        ZuoraApiFailure(
          s"RatePlan.upToPeriodsType=${unsupportedBillingPeriodType.getOrElse("null")} is not supported",
        ).asLeft
    }
  }

  case class BillingPeriod(unit: ChronoUnit, multiple: Int)
}
