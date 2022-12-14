package com.gu.supporter.fulfilment

import java.time.LocalDate

import com.gu.effects.S3Location
import com.gu.fulfilmentdates.FulfilmentDatesLocation.fulfilmentDatesBucket
import io.circe.generic.auto._
import io.circe.parser.decode
import scalaj.http.Http

case class GovUkBankHolidays(
    `england-and-wales`: BankHolidays,
    scotland: BankHolidays,
    `northern-ireland`: BankHolidays,
)

case class Event(
    // title: String,
    // notes: String,
    // bunting: Boolean,
    date: LocalDate,
)

case class BankHolidays(events: List[Event] /*, division: String*/ )

object GovUkBankHolidays {

  val fallbackFileLocation = S3Location(fulfilmentDatesBucket(), "UK_BANK_HOLIDAYS.json");

  def apply(): GovUkBankHolidays = {

    val rawResponseBody = Http("https://www.gov.uk/bank-holidays.json").asString.body

    decode[GovUkBankHolidays](rawResponseBody) match {
      case Right(bankHols) =>
        BucketHelpers.write(fallbackFileLocation, rawResponseBody)
        bankHols
      case Left(error) =>
        // TODO log error and perhaps alert on serving multi-day stale bank hols file
        decode[GovUkBankHolidays](
          BucketHelpers.read(fallbackFileLocation),
        ).getOrElse(
          throw new RuntimeException("Couldn't even get the fallback bank holidays file "),
        )
    }
  }

}
