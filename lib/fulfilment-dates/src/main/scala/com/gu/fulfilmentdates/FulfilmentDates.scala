package com.gu.fulfilmentdates

import java.time.LocalDate
import java.time.format.{DateTimeFormatterBuilder, TextStyle}
import java.time.temporal.ChronoField.DAY_OF_WEEK
import java.util.Locale

/** @param today
  *   just to be explicit
  * @param deliveryAddressChangeEffectiveDate
  *   the date of the first issue [of that day of week] which will reflect any changes to the delivery address made on
  *   'today'
  * @param holidayStopFirstAvailableDate
  *   the earliest date [of that day of week] that can be selected as the start of a holiday stop (so we know we can
  *   definitely block fulfilment - via the holiday-stop-processor)
  * @param holidayStopProcessorTargetDate
  *   the issue date [of that day of week] that the holiday-stop-processor should process the holiday stops for (can be
  *   null)
  * @param finalFulfilmentFileGenerationDate
  *   not currently consumed but is a useful date for context
  * @param newSubscriptionEarliestStartDate
  *   the first available fulfilment start date for that package, if it were taken out today
  */
case class FulfilmentDates(
    today: LocalDate,
    deliveryAddressChangeEffectiveDate: Option[LocalDate],
    holidayStopFirstAvailableDate: LocalDate,
    holidayStopProcessorTargetDate: Option[LocalDate],
    finalFulfilmentFileGenerationDate: Option[LocalDate],
    newSubscriptionEarliestStartDate: LocalDate,
)

object FulfilmentDates {
  def apply(
      today: LocalDate,
      holidayStopFirstAvailableDate: LocalDate,
      holidayStopProcessorTargetDate: Option[LocalDate],
      newSubscriptionEarliestStartDate: LocalDate,
  ): FulfilmentDates =
    FulfilmentDates(
      today,
      deliveryAddressChangeEffectiveDate = None,
      holidayStopFirstAvailableDate,
      holidayStopProcessorTargetDate,
      finalFulfilmentFileGenerationDate = None,
      newSubscriptionEarliestStartDate = newSubscriptionEarliestStartDate,
    )

  def apply(
      today: LocalDate,
      deliveryAddressChangeEffectiveDate: LocalDate,
      holidayStopFirstAvailableDate: LocalDate,
      holidayStopProcessorTargetDate: Option[LocalDate],
      finalFulfilmentFileGenerationDate: LocalDate,
      newSubscriptionEarliestStartDate: LocalDate,
  ): FulfilmentDates =
    FulfilmentDates(
      today = today,
      deliveryAddressChangeEffectiveDate = Some(deliveryAddressChangeEffectiveDate),
      holidayStopFirstAvailableDate = holidayStopFirstAvailableDate,
      holidayStopProcessorTargetDate = holidayStopProcessorTargetDate,
      finalFulfilmentFileGenerationDate = Some(finalFulfilmentFileGenerationDate),
      newSubscriptionEarliestStartDate = newSubscriptionEarliestStartDate,
    )

  val dayOfWeekFormat =
    new DateTimeFormatterBuilder()
      .appendText(DAY_OF_WEEK, TextStyle.FULL)
      .toFormatter(Locale.ENGLISH)
}
