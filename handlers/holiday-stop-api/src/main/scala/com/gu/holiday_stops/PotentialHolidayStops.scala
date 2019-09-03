package com.gu.holiday_stops

import java.time.LocalDate

import play.api.libs.json.{Format, Json, Reads}

case class PotentialHolidayStop(publicationDate: LocalDate, credit: Option[Double])

object PotentialHolidayStop {
  implicit val reads: Format[PotentialHolidayStop] = Json.format[PotentialHolidayStop]
}

case class PotentialHolidayStopsResponse(potentials: List[PotentialHolidayStop])

object PotentialHolidayStopsResponse {
  implicit val reads: Format[PotentialHolidayStopsResponse] = Json.format[PotentialHolidayStopsResponse]
}

case class PotentialHolidayStopsV2QueryParams(startDate: LocalDate, endDate: LocalDate, estimateCredit: Option[String])

object PotentialHolidayStopsV2QueryParams {
  implicit val reads: Reads[PotentialHolidayStopsV2QueryParams] = Json.reads[PotentialHolidayStopsV2QueryParams]
}
