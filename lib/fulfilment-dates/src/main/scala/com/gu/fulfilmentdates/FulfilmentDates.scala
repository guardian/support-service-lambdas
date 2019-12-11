package com.gu.fulfilmentdates

import java.time.LocalDate

case class FulfilmentDates(
  today: LocalDate,
  acquisitionsStartDate: LocalDate,
  deliveryAddressChangeEffectiveDate: LocalDate,
  holidayStopFirstAvailableDate: LocalDate,
  finalFulfilmentFileGenerationDate: LocalDate,
  nextAffectablePublicationDateOnFrontCover: LocalDate
)

