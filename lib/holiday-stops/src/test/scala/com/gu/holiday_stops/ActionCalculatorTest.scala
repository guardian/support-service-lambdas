package com.gu.holiday_stops

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest._
import org.joda.time.{DateTimeConstants, LocalDate}
import org.scalatest.{FlatSpec, Matchers}

class ActionCalculatorTest extends FlatSpec with Matchers {

  val gwProductName = ProductName("Guardian Weekly Zone A")

  it should "convert ProductName to a day of the week" in {

    ActionCalculator.productNameToDayOfWeek(gwProductName) shouldEqual DateTimeConstants.FRIDAY

    assertThrows[MatchError] {
      ActionCalculator.productNameToDayOfWeek(ProductName("blah"))
    }

  }

  it should "correctly list the action dates for given Holiday Stop Request" in {

    ActionCalculator.publicationDatesToBeStopped(
      HolidayStopRequest(
        HolidayStopRequestId(""),
        HolidayStopRequestStartDate(new LocalDate(2019, 5, 18)),
        HolidayStopRequestEndDate(new LocalDate(2019, 6, 20)),
        HolidayStopRequestActionedCount(0),
        SubscriptionName(""),
        gwProductName
      )
    ) shouldEqual List(
      new LocalDate(2019, 5, 24),
      new LocalDate(2019, 5, 31),
      new LocalDate(2019, 6, 7),
      new LocalDate(2019, 6, 14)
    )

    ActionCalculator.publicationDatesToBeStopped(
      HolidayStopRequest(
        HolidayStopRequestId(""),
        HolidayStopRequestStartDate(new LocalDate(2019, 5, 18)),
        HolidayStopRequestEndDate(new LocalDate(2019, 6, 21)),
        HolidayStopRequestActionedCount(0),
        SubscriptionName(""),
        gwProductName
      )
    ) shouldEqual List(
      new LocalDate(2019, 5, 24),
      new LocalDate(2019, 5, 31),
      new LocalDate(2019, 6, 7),
      new LocalDate(2019, 6, 14),
      new LocalDate(2019, 6, 21)
    )

  }

}