package com.gu.fulfilmentdates

import java.time.LocalDate

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
}

