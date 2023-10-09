package com.gu.supporter.fulfilment

import java.time.DayOfWeek._
import java.time.temporal.TemporalAdjusters.{next, nextOrSame}
import java.time.{DayOfWeek, LocalDate}

import com.gu.fulfilmentdates.FulfilmentDates
import com.gu.fulfilmentdates.FulfilmentDates.dayOfWeekFormat

import scala.collection.immutable.ListMap

object HomeDeliveryFulfilmentDates {

  def apply(today: LocalDate, bankHolidays: BankHolidays): ListMap[String, FulfilmentDates] =
    ListMap( // to preserve insertion order, so the file is easier to read
      List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY).map(targetDayOfWeek =>
        dayOfWeekFormat.format(targetDayOfWeek) -> FulfilmentDates(
          today,
          deliveryAddressChangeEffectiveDate(targetDayOfWeek, today, bankHolidays),
          holidayStopFirstAvailableDate(targetDayOfWeek, today, bankHolidays),
          holidayStopProcessorTargetDate(targetDayOfWeek, today, bankHolidays),
          finalFulfilmentFileGenerationDate(targetDayOfWeek, today, bankHolidays),
          newSubscriptionEarliestStartDate(targetDayOfWeek, today),
        ),
      ): _*,
    )

  private def getFulfilmentFileGenerationDateForNextTargetDayOfWeek(
      nextTargetDayOfWeek: LocalDate,
      bankHolidays: BankHolidays,
  ): LocalDate = {
    val distributorPickupDay: LocalDate = new WorkingDays(bankHolidays).findWorkingDayBefore(nextTargetDayOfWeek)
    distributorPickupDay.minusDays(0) // distributor picks up files generated early-AM that SAME morning
  }

  private def getFulfilmentFileGenerationDateForNextTargetDayOfWeek(
      targetDayOfWeek: DayOfWeek,
      today: LocalDate,
      bankHolidays: BankHolidays,
  ): LocalDate = getFulfilmentFileGenerationDateForNextTargetDayOfWeek(
    today `with` next(targetDayOfWeek), bankHolidays
  )

  def finalFulfilmentFileGenerationDate(
      targetDayOfWeek: DayOfWeek,
      today: LocalDate,
      bankHolidays: BankHolidays,
  ): LocalDate = {
    val fulfilmentFileGenerationDateForNextTargetDayOfWeek =
      getFulfilmentFileGenerationDateForNextTargetDayOfWeek(targetDayOfWeek, today, bankHolidays)
    if (fulfilmentFileGenerationDateForNextTargetDayOfWeek isAfter today) {
      // we're still in time to affect the next target day
      fulfilmentFileGenerationDateForNextTargetDayOfWeek
    } else {
      // we're not in time to affect the next target day, so return the one the following week
      fulfilmentFileGenerationDateForNextTargetDayOfWeek `with` next(
        fulfilmentFileGenerationDateForNextTargetDayOfWeek.getDayOfWeek,
      )
    }
  }

  // Cover date of first issue sent to the new address.
  def deliveryAddressChangeEffectiveDate(
      targetDayOfWeek: DayOfWeek,
      today: LocalDate,
      bankHolidays: BankHolidays,
  ): LocalDate =
    finalFulfilmentFileGenerationDate(targetDayOfWeek, today, bankHolidays) `with` next(targetDayOfWeek)

  def holidayStopFirstAvailableDate(
      targetDayOfWeek: DayOfWeek,
      today: LocalDate,
      bankHolidays: BankHolidays,
  ): LocalDate = {
    val nextTargetDayOfWeek = today `with` next(targetDayOfWeek)
    val fulfilmentFileGenerationDateForNextTargetDayOfWeek = getFulfilmentFileGenerationDateForNextTargetDayOfWeek(
      nextTargetDayOfWeek, bankHolidays
    )
    val holidayStopProcessingDayForNextTargetDayOfWeek = fulfilmentFileGenerationDateForNextTargetDayOfWeek minusDays 1
    if (holidayStopProcessingDayForNextTargetDayOfWeek isAfter today) {
      // we're still in time to affect the next target day
      nextTargetDayOfWeek
    } else {
      // we're not in time to affect the next target day, so return the one the following week
      nextTargetDayOfWeek `with` next(targetDayOfWeek)
    }
  }

  def holidayStopProcessorTargetDate(
      targetDayOfWeek: DayOfWeek,
      today: LocalDate,
      bankHolidays: BankHolidays,
  ): Option[LocalDate] = {
    val fulfilmentFileGenerationDateForNextTargetDayOfWeek =
      getFulfilmentFileGenerationDateForNextTargetDayOfWeek(targetDayOfWeek, today, bankHolidays)
    if ((fulfilmentFileGenerationDateForNextTargetDayOfWeek minusDays 1) isEqual today) {
      // this is the holiday-stop-processor for the target day
      Some(fulfilmentFileGenerationDateForNextTargetDayOfWeek `with` next(targetDayOfWeek))
    } else {
      None
    }
  }

  /** This is designed to implement the delay before fulfilment can be started defined by this grid:
    * ----------------------------------------------------------------------------------- \| Pack | Mon | Tue | Wed |
    * Thu | Fri | Sat | Sun |
    * -----------------------------------------------------------------------------------
    * | Everyday | 3 | 3 | 3 | 6  | 5 | 4 | 3 |
    * |:---------|:-:|:-:|:-:|:--:|:-:|:-:|:-:|
    * | Sixday   | 3 | 3 | 3 | 6  | 5 | 4 | 3 |
    * | Weekend  | 5 | 4 | 3 | 9  | 8 | 7 | 3 |
    * | Saturday | 5 | 4 | 3 | 9  | 8 | 7 | 6 |
    * | Sunday   | 6 | 5 | 4 | 10 | 9 | 8 | 7 |
    * -----------------------------------------------------------------------------------
    *
    * This is designed to ensure all subscription make it into the fulfilment files for the first day of the
    * subscription, including easter bank holidays etc.
    *
    * This grid is probably in most cases overly conservative however the fulfilment partners have a report that they
    * can use to track acquisitions in order to re-plan routes etc if its necessary.
    *
    * So any change need to be agreed.
    */
  def newSubscriptionEarliestStartDate(
      targetDayOfWeek: DayOfWeek,
      today: LocalDate,
  ): LocalDate = {
    val startDateDelay = today.getDayOfWeek match {
      case DayOfWeek.THURSDAY => 6
      case DayOfWeek.FRIDAY => 5
      case DayOfWeek.SATURDAY => 4
      case _ => 3
    }

    today.plusDays(startDateDelay.toLong).`with`(nextOrSame(targetDayOfWeek))
  }
}
