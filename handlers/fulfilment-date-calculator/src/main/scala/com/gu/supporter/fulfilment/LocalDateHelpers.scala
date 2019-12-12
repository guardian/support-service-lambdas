package com.gu.supporter.fulfilment

import java.time.DayOfWeek.{FRIDAY, MONDAY, THURSDAY, TUESDAY, WEDNESDAY}
import java.time.LocalDate

object LocalDateHelpers {

  implicit class LocalDateWithWorkingDaySupport(date: LocalDate) {

    val NormalWorkingDays = List(
      MONDAY,
      TUESDAY,
      WEDNESDAY,
      THURSDAY,
      FRIDAY
    )

    def isWorkingDay: Boolean = NormalWorkingDays.contains(date.getDayOfWeek) // TODO add bank hols here

    def findPreviousWorkingDay: LocalDate = {
      val previousDay = date.minusDays(1)
      if (previousDay isWorkingDay) {
        previousDay
      } else {
        previousDay findPreviousWorkingDay
      }
    }

  }

}
