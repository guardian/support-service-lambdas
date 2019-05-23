package com.gu.holidaystopprocessor

import java.time.LocalDate

case class HolidayStop(
  subscriptionName: String,
  stoppedPublicationDate: LocalDate
)

case class HolidayStopResponse(code: String, price: Double)
