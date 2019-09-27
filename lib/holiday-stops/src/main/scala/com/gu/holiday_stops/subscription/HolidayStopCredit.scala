package com.gu.holiday_stops.subscription

import java.time.LocalDate

import play.api.libs.json.{Format, Json}

case class HolidayStopCredit(amount: Double, invoiceDate: LocalDate)

object HolidayStopCredit {

  implicit val format: Format[HolidayStopCredit] = Json.format[HolidayStopCredit]

  // TODO: use genuine invoice date
  def apply(amount: Double): HolidayStopCredit =
    HolidayStopCredit(amount, invoiceDate = LocalDate.of(1970, 1, 1))
}
