package com.gu.holiday_stops

import java.time.LocalDate

import com.gu.zuora.subscription.Credit
import play.api.libs.json.Json
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class PotentialHolidayStopsResponseTest extends AnyFlatSpec with Matchers {

  private val response = PotentialHolidayStopsResponse(
    nextInvoiceDateAfterToday = LocalDate.of(2019, 10, 1),
    potentials = List(
      PotentialHolidayStop(
        publicationDate = LocalDate.of(2019, 9, 27),
        expectedCredit = Credit(
          amount = -2.89,
          invoiceDate = LocalDate.of(2019, 10, 1),
        ),
      ),
    ),
  )

  private val jsonString =
    """{"nextInvoiceDateAfterToday":"2019-10-01","potentials":[{"publicationDate":"2019-09-27","credit":-2.89,"invoiceDate":"2019-10-01"}]}"""

  "parse" should "read json correctly" in {
    Json.parse(jsonString).as[PotentialHolidayStopsResponse] should equal(response)
  }

  "toJson" should "generate correct json" in {
    Json.toJson(response).toString should equal(jsonString)
  }
}
