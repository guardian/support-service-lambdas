package com.gu.supporter.fulfilment

import java.time.DayOfWeek._
import java.time.LocalDate

class WorkingDays(bankHolidays: BankHolidays) {

  private val NormalWorkingDays = List(
    MONDAY,
    TUESDAY,
    WEDNESDAY,
    THURSDAY,
    FRIDAY,
  )

  def isWorkingDay(date: LocalDate): Boolean =
    NormalWorkingDays.contains(date.getDayOfWeek) && !bankHolidays.events.map(_.date).contains(date)

  def findWorkingDayBefore(date: LocalDate): LocalDate = {
    val previousDay = date.minusDays(1)
    if (isWorkingDay(previousDay)) {
      previousDay
    } else {
      findWorkingDayBefore(previousDay)
    }
  }

}
