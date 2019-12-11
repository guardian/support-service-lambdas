package com.gu.supporter.fulfilment

import java.time.DayOfWeek._
import java.time.format.TextStyle.FULL
import java.time.temporal.TemporalAdjusters
import java.time.{DayOfWeek, LocalDate}
import java.util.Locale.ENGLISH

import com.gu.supporter.fulfilment.LocalDateHelpers.LocalDateWithWorkingDaySupport

object HomeDeliveryFulfilmentDates {

  def apply(today: LocalDate): Map[String, FulfilmentDates] =
    List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY).map(targetDayOfWeek =>
      targetDayOfWeek.getDisplayName(FULL, ENGLISH) -> FulfilmentDates(
        today,
        deliveryAddressChangeEffectiveDate(targetDayOfWeek, today),
        holidayStopFirstAvailableDate = nextAffectablePublicationDateOnFrontCover(targetDayOfWeek, today), //TODO
        finalFulfilmentFileGenerationDate(targetDayOfWeek, today),
        nextAffectablePublicationDateOnFrontCover(targetDayOfWeek, today)
      )).toMap

  def finalFulfilmentFileGenerationDate(targetDayOfWeek: DayOfWeek, today: LocalDate): LocalDate = {
    val nextTargetDayOfWeek = today `with` TemporalAdjusters.next(targetDayOfWeek)
    val distributorPickupDay = nextTargetDayOfWeek findPreviousWorkingDay
    val finalFulfilmentFileGenerationDate = distributorPickupDay minusDays 1 //TODO double check this shouldn't be two days
    if (finalFulfilmentFileGenerationDate isAfter today) {
      // we're still in time to affect the next target day
      finalFulfilmentFileGenerationDate
    } else {
      // we're not in time to affect the next target day, so return the one the following week
      finalFulfilmentFileGenerationDate `with` TemporalAdjusters.next(finalFulfilmentFileGenerationDate.getDayOfWeek)
    }
  }

  def nextAffectablePublicationDateOnFrontCover(targetDayOfWeek: DayOfWeek, today: LocalDate): LocalDate =
    finalFulfilmentFileGenerationDate(targetDayOfWeek, today) `with` TemporalAdjusters.next(targetDayOfWeek)

  // Cover date of first issue sent to the new address.
  def deliveryAddressChangeEffectiveDate(targetDayOfWeek: DayOfWeek, today: LocalDate): LocalDate =
    nextAffectablePublicationDateOnFrontCover(targetDayOfWeek, today)

}
