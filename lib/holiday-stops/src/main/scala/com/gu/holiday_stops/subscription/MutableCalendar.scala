package com.gu.holiday_stops.subscription

import java.time.LocalDate

/**
 * Enables simulating what is today for testing purposes.
 * Inspired by DateTimeUtils.setCurrentMillisFixed()
 * Joda's https://stackoverflow.com/q/24491260/5205022
 */
object MutableCalendar {
  var fakeToday: Option[LocalDate] = None
  def today: LocalDate = fakeToday.getOrElse(LocalDate.now)
}
