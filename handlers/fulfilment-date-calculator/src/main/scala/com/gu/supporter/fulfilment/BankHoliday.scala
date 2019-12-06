package com.gu.supporter.fulfilment

import scalaj.http.{Http, HttpRequest}
import io.circe.generic.auto._
import io.circe.parser.decode

case class GovUkBankHolidays(
  `england-and-wales`: BankHolidays,
  scotland: BankHolidays,
  `northern-ireland`: BankHolidays
)

case class Event(
  title: String,
  date: String,
  notes: String,
  bunting: Boolean
)

case class BankHolidays(events: List[Event], division: String)

object GovUkBankHolidays {
  def apply(): GovUkBankHolidays = {
    val request: HttpRequest = Http("https://www.gov.uk/bank-holidays.json")
    decode[GovUkBankHolidays](request.asString.body).getOrElse(throw new RuntimeException("Failed to retrieve Bank Holidays"))
  }
}
