package com.gu.supporter.fulfilment

import java.time.DayOfWeek.{FRIDAY, MONDAY, THURSDAY, TUESDAY, WEDNESDAY}
import java.time.LocalDate

object LocalDateHelpers {

  implicit class LocalDateWithWorkingDaySupport(date: LocalDate)(implicit bankHolidays: BankHolidays) {

    val NormalWorkingDays = List(
      MONDAY,
      TUESDAY,
      WEDNESDAY,
      THURSDAY,
      FRIDAY,
    )

    def isWorkingDay: Boolean =
      NormalWorkingDays.contains(date.getDayOfWeek) && !bankHolidays.events.map(_.date).contains(date)

    def findPreviousWorkingDay: LocalDate = {
      val previousDay = date.minusDays(1)
      if (previousDay.isWorkingDay) {
        previousDay
      } else {
        previousDay.findPreviousWorkingDay
      }
    }

  }

}
