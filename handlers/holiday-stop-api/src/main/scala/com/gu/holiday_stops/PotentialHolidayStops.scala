package com.gu.holiday_stops

import java.time.LocalDate

import com.gu.holiday_stops.subscription.HolidayStopCredit
import play.api.libs.json.Reads._
import play.api.libs.json._

case class PotentialHolidayStop(
  publicationDate: LocalDate,
  expectedCredit: Option[HolidayStopCredit]
)

object PotentialHolidayStop {

  // Hand-crafting the json representation to avoid needing a new endpoint when model changes
  implicit val format: Format[PotentialHolidayStop] = new Format[PotentialHolidayStop] {

    override def reads(json: JsValue): JsResult[PotentialHolidayStop] = for {
      publicationDate <- (json \ "publicationDate").validate[LocalDate]
      optAmount <- (json \ "credit").validateOpt[Double]
      optInvoiceDate <- (json \ "invoiceDate").validateOpt[LocalDate]
    } yield {
      val expectedCredit = for {
        amount <- optAmount
        invoiceDate <- optInvoiceDate
      } yield HolidayStopCredit(amount, invoiceDate)
      PotentialHolidayStop(publicationDate, expectedCredit)
    }

    override def writes(stop: PotentialHolidayStop): JsValue =
      Json.obj(
        "publicationDate" -> stop.publicationDate,
        "credit" -> stop.expectedCredit.map(_.amount),
        "invoiceDate" -> stop.expectedCredit.map(_.invoiceDate)
      )
  }
}

case class PotentialHolidayStopsResponse(potentials: List[PotentialHolidayStop])

object PotentialHolidayStopsResponse {

  implicit val format: Format[PotentialHolidayStopsResponse] =
    Json.format[PotentialHolidayStopsResponse]
}
