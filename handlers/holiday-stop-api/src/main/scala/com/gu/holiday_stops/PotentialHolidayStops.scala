package com.gu.holiday_stops

import java.time.LocalDate

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest
import play.api.libs.json.{Format, Json, Reads}

case class PotentialHolidayStop(issueDate: LocalDate, estimatedPrice: Option[Double])
object PotentialHolidayStop {
  implicit val reads: Format[PotentialHolidayStop] = Json.format[PotentialHolidayStop]
}

case class PotentialHolidayStopsResponse(issues: List[PotentialHolidayStop])
object PotentialHolidayStopsResponse {
  implicit val reads: Format[PotentialHolidayStopsResponse] = Json.format[PotentialHolidayStopsResponse]
}

case class PotentialHolidayStopParamsV2(startDate: LocalDate, endDate: LocalDate, estmimatePrice: Option[Boolean])
object PotentialHolidayStopParamsV2 {
  implicit val reads: Reads[PotentialHolidayStopParamsV2] = Json.reads[PotentialHolidayStopParamsV2]
}
