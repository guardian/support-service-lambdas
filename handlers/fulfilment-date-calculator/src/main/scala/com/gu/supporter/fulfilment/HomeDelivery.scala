package com.gu.supporter.fulfilment

import java.time.DayOfWeek._
import java.time.temporal.TemporalAdjusters.next
import java.time.{DayOfWeek, LocalDate}

import com.gu.fulfilmentdates.FulfilmentDates
import com.gu.fulfilmentdates.FulfilmentDates.dayOfWeekFormat
import com.gu.supporter.fulfilment.LocalDateHelpers.LocalDateWithWorkingDaySupport

import scala.collection.immutable.ListMap

object HomeDeliveryFulfilmentDates {

  def apply(today: LocalDate)(implicit bankHolidays: BankHolidays): ListMap[String, FulfilmentDates] =
    ListMap( // to preserve insertion order, so the file is easier to read
      List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY).map(targetDayOfWeek =>
        dayOfWeekFormat.format(targetDayOfWeek) -> FulfilmentDates(
          today,
          deliveryAddressChangeEffectiveDate(targetDayOfWeek, today),
          holidayStopFirstAvailableDate(targetDayOfWeek, today),
          holidayStopProcessorTargetDate(targetDayOfWeek, today),
          finalFulfilmentFileGenerationDate(targetDayOfWeek, today)
        )): _*
    )

  private def getFulfilmentFileGenerationDateForNextTargetDayOfWeek(
    nextTargetDayOfWeek: LocalDate
  )(
    implicit
    bankHolidays: BankHolidays
  ): LocalDate = {
    val distributorPickupDay: LocalDate = (nextTargetDayOfWeek findPreviousWorkingDay)
    distributorPickupDay minusDays 0 // distributor picks up files generated early-AM that SAME morning
  }

  private def getFulfilmentFileGenerationDateForNextTargetDayOfWeek(
    targetDayOfWeek: DayOfWeek,
    today: LocalDate
  )(
    implicit
    bankHolidays: BankHolidays
  ): LocalDate = getFulfilmentFileGenerationDateForNextTargetDayOfWeek(
    today `with` next(targetDayOfWeek)
  )

  def finalFulfilmentFileGenerationDate(
    targetDayOfWeek: DayOfWeek,
    today: LocalDate
  )(
    implicit
    bankHolidays: BankHolidays
  ): LocalDate = {
    val fulfilmentFileGenerationDateForNextTargetDayOfWeek = getFulfilmentFileGenerationDateForNextTargetDayOfWeek(targetDayOfWeek, today)
    if (fulfilmentFileGenerationDateForNextTargetDayOfWeek isAfter today) {
      // we're still in time to affect the next target day
      fulfilmentFileGenerationDateForNextTargetDayOfWeek
    } else {
      // we're not in time to affect the next target day, so return the one the following week
      fulfilmentFileGenerationDateForNextTargetDayOfWeek `with` next(fulfilmentFileGenerationDateForNextTargetDayOfWeek.getDayOfWeek)
    }
  }

  // Cover date of first issue sent to the new address.
  def deliveryAddressChangeEffectiveDate(
    targetDayOfWeek: DayOfWeek,
    today: LocalDate
  )(
    implicit
    bankHolidays: BankHolidays
  ): LocalDate =
    finalFulfilmentFileGenerationDate(targetDayOfWeek, today) `with` next(targetDayOfWeek)

  def holidayStopFirstAvailableDate(
    targetDayOfWeek: DayOfWeek,
    today: LocalDate
  )(
    implicit
    bankHolidays: BankHolidays
  ): LocalDate = {
    val nextTargetDayOfWeek = today `with` next(targetDayOfWeek)
    val fulfilmentFileGenerationDateForNextTargetDayOfWeek = getFulfilmentFileGenerationDateForNextTargetDayOfWeek(nextTargetDayOfWeek)
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
    today: LocalDate
  )(
    implicit
    bankHolidays: BankHolidays
  ): Option[LocalDate] = {
    val fulfilmentFileGenerationDateForNextTargetDayOfWeek = getFulfilmentFileGenerationDateForNextTargetDayOfWeek(targetDayOfWeek, today)
    if ((fulfilmentFileGenerationDateForNextTargetDayOfWeek minusDays 1) isEqual today) {
      // this is the holiday-stop-processor for the target day
      Some(fulfilmentFileGenerationDateForNextTargetDayOfWeek `with` next(targetDayOfWeek))
    } else {
      None
    }
  }

}
