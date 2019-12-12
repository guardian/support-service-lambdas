package com.gu.fulfilmentdates

import java.time.LocalDate

case class FulfilmentDates(
  today: LocalDate,
  deliveryAddressChangeEffectiveDate: LocalDate,
  holidayStopFirstAvailableDate: LocalDate,
  finalFulfilmentFileGenerationDate: LocalDate
)

