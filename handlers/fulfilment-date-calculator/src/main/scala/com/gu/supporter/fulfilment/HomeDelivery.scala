package com.gu.supporter.fulfilment

import java.time.DayOfWeek._
import java.time.format.TextStyle.FULL
import java.time.temporal.TemporalAdjusters
import java.time.{DayOfWeek, LocalDate}
import java.util.Locale.ENGLISH

import com.gu.supporter.fulfilment.LocalDateHelpers.LocalDateWithWorkingDaySupport

import scala.collection.immutable.ListMap

object HomeDeliveryFulfilmentDates {

  def apply(today: LocalDate)(implicit bankHolidays: BankHolidays): ListMap[String, FulfilmentDates] =
    ListMap( // to preserve insertion order, so the file is easier to read
      List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY).map(targetDayOfWeek =>
        targetDayOfWeek.getDisplayName(FULL, ENGLISH) -> FulfilmentDates(
          today,
          deliveryAddressChangeEffectiveDate(targetDayOfWeek, today),
          holidayStopFirstAvailableDate(targetDayOfWeek, today),
          finalFulfilmentFileGenerationDate(targetDayOfWeek, today)
        )):_*
    )

  private def getFulfilmentFileGenerationDateForNextTargetDayOfWeek(
    targetDayOfWeek: DayOfWeek,
    today: LocalDate
  )(
    implicit
    bankHolidays: BankHolidays
  ): LocalDate = {
    val nextTargetDayOfWeek = today `with` TemporalAdjusters.next(targetDayOfWeek)
    val distributorPickupDay: LocalDate = (nextTargetDayOfWeek findPreviousWorkingDay)
    distributorPickupDay minusDays 1 //TODO double check this shouldn't be two days
  }

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
      fulfilmentFileGenerationDateForNextTargetDayOfWeek `with` TemporalAdjusters.next(fulfilmentFileGenerationDateForNextTargetDayOfWeek.getDayOfWeek)
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
    finalFulfilmentFileGenerationDate(targetDayOfWeek, today) `with` TemporalAdjusters.next(targetDayOfWeek)

  def holidayStopFirstAvailableDate(
    targetDayOfWeek: DayOfWeek,
    today: LocalDate
  )(
    implicit
    bankHolidays: BankHolidays
  ): LocalDate = {
    val fulfilmentFileGenerationDateForNextTargetDayOfWeek = getFulfilmentFileGenerationDateForNextTargetDayOfWeek(targetDayOfWeek, today)
    val holidayStopProcessingDayForNextTargetDayOfWeek = fulfilmentFileGenerationDateForNextTargetDayOfWeek minusDays 1
    (
      if (holidayStopProcessingDayForNextTargetDayOfWeek isAfter today) {
        // we're still in time to affect the next target day
        holidayStopProcessingDayForNextTargetDayOfWeek
      } else {
        // we're not in time to affect the next target day, so return the one the following week
        holidayStopProcessingDayForNextTargetDayOfWeek `with` TemporalAdjusters.next(fulfilmentFileGenerationDateForNextTargetDayOfWeek.getDayOfWeek)
      }
    ) `with` TemporalAdjusters.next(targetDayOfWeek)
  }

}
