package com.gu.fulfilmentdates

import java.time.LocalDate
import java.time.format.{DateTimeFormatterBuilder, TextStyle}
import java.time.temporal.ChronoField.DAY_OF_WEEK
import java.util.Locale

case class FulfilmentDates(
  today: LocalDate,
  deliveryAddressChangeEffectiveDate: LocalDate,
  holidayStopFirstAvailableDate: LocalDate,
  finalFulfilmentFileGenerationDate: LocalDate
)

object FulfilmentDates {
  val dayOfWeekFormat =
    new DateTimeFormatterBuilder()
      .appendText(DAY_OF_WEEK, TextStyle.FULL)
      .toFormatter(Locale.ENGLISH)
}
