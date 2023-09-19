package com.gu.supporter.fulfilment

import com.gu.fulfilmentdates.FulfilmentDates
import com.gu.fulfilmentdates.FulfilmentDates.dayOfWeekFormat

import java.time.DayOfWeek._
import java.time.temporal.TemporalAdjusters.next
import java.time.{DayOfWeek, LocalDate}
import scala.collection.immutable.ListMap

object NationalDeliveryFulfilmentDates {
  def apply(today: LocalDate, bankHolidays: BankHolidays): ListMap[String, FulfilmentDates] =
    new NationalDeliveryFulfilmentDates(today, new WorkingDays(bankHolidays)).dates
}

private class NationalDeliveryFulfilmentDates(today: LocalDate, workingDays: WorkingDays) {

  private val dates: ListMap[String, FulfilmentDates] =
    ListMap( // to preserve insertion order, so the file is easier to read
      List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY).map { targetDayOfWeek =>
        dayOfWeekFormat.format(targetDayOfWeek) -> getDatesForTargetDay(targetDayOfWeek)
      }: _*,
    )

  private def downloadDateFor(candidateCoverDate: LocalDate) =
    workingDays.findWorkingDayBefore(workingDays.findWorkingDayBefore(candidateCoverDate))

  private def getDatesForTargetDay(targetDayOfWeek: DayOfWeek): FulfilmentDates = {

    // they will download it 2 working days before.  e.g. Wednesday's cover will be downloaded on Monday working hours
    // we generate it early morning and it will be downloaded during working hours

    val upcomingCoverDate = today.`with`(next(targetDayOfWeek))
    val subsequentCoverDate = upcomingCoverDate.`with`(next(targetDayOfWeek))

    if (downloadDateFor(upcomingCoverDate).isBefore(today))
      datesForCoverDate(subsequentCoverDate, None)
    else if (downloadDateFor(upcomingCoverDate).isEqual(today))
      datesForCoverDate(subsequentCoverDate, Some(upcomingCoverDate))
    else // downloadDateFor(upcomingCoverDate).isAfter(today)
      datesForCoverDate(upcomingCoverDate, None)

  }

  private def datesForCoverDate(coverDate: LocalDate, precedingCoverDateIfGeneratedToday: Option[LocalDate]) =
    FulfilmentDates(
      today = today,
      deliveryAddressChangeEffectiveDate = coverDate,
      holidayStopFirstAvailableDate = coverDate,
      holidayStopProcessorTargetDate = precedingCoverDateIfGeneratedToday,
      finalFulfilmentFileGenerationDate = downloadDateFor(coverDate),
      newSubscriptionEarliestStartDate = coverDate,
    )

}
