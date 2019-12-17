package com.gu.fulfilmentdates

import java.time.LocalDate
import java.time.format.{DateTimeFormatterBuilder, TextStyle}
import java.time.temporal.ChronoField.DAY_OF_WEEK
import java.util.Locale

case class FulfilmentDates(
  today: LocalDate,
  deliveryAddressChangeEffectiveDate: Option[LocalDate],
  holidayStopFirstAvailableDate: LocalDate,
  finalFulfilmentFileGenerationDate: Option[LocalDate]
)

object FulfilmentDates {
  def apply(today: LocalDate, holidayStopFirstAvailableDate: LocalDate): FulfilmentDates =
    FulfilmentDates(
      today,
      deliveryAddressChangeEffectiveDate = None,
      holidayStopFirstAvailableDate,
      finalFulfilmentFileGenerationDate = None
    )

  def apply(today: LocalDate, deliveryAddressChangeEffectiveDate: LocalDate, holidayStopFirstAvailableDate: LocalDate, finalFulfilmentFileGenerationDate: LocalDate): FulfilmentDates =
    FulfilmentDates(
      today,
      Some(deliveryAddressChangeEffectiveDate),
      holidayStopFirstAvailableDate,
      Some(finalFulfilmentFileGenerationDate)
    )

  val dayOfWeekFormat =
    new DateTimeFormatterBuilder()
      .appendText(DAY_OF_WEEK, TextStyle.FULL)
      .toFormatter(Locale.ENGLISH)
}
