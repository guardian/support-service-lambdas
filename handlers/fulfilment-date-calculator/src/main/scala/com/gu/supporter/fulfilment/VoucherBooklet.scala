package com.gu.supporter.fulfilment

import java.time.DayOfWeek._
import java.time.LocalDate
import java.time.format.TextStyle.FULL
import java.util.Locale.ENGLISH

import com.gu.fulfilmentdates.FulfilmentDates

import scala.collection.immutable.ListMap

object VoucherBookletFulfilmentDates {

  lazy val VoucherHolidayStopProcessorLeadTime: Int = 1

  def apply(today: LocalDate): ListMap[String, FulfilmentDates] =
    ListMap( // to preserve insertion order, so the file is easier to read
      List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY).map(targetDayOfWeek =>
        targetDayOfWeek.getDisplayName(FULL, ENGLISH) -> FulfilmentDates(
          today,
          holidayStopFirstAvailableDate(today),
        )
      ):_*
    )

  def holidayStopFirstAvailableDate(today: LocalDate): LocalDate = today plusDays VoucherHolidayStopProcessorLeadTime

}