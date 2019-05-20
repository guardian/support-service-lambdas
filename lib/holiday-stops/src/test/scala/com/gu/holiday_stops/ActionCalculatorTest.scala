package com.gu.holiday_stops

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest._
import org.joda.time.LocalDate
import org.scalatest.{FlatSpec, Matchers}

class ActionCalculatorTest extends FlatSpec with Matchers {

  val gwProductName = ProductName("Guardian Weekly Zone A")

  it should "convert ProductName to a day of the week" in {

    ActionCalculator.productNameToDayOfWeek(gwProductName) shouldEqual 4

    assertThrows[MatchError] {
      ActionCalculator.productNameToDayOfWeek(ProductName("blah"))
    }

  }

  it should "correctly list the action dates for given Holiday Stop Request" in {

    ActionCalculator.calculateActionDatesForGivenHolidayStopRequest(
      HolidayStopRequest(
        HolidayStopRequestId(""),
        HolidayStopRequestStartDate(new LocalDate(2019, 5, 17)),
        HolidayStopRequestEndDate(new LocalDate(2019, 6, 19)),
        HolidayStopRequestActionedCount(0),
        SubscriptionName(""),
        gwProductName
      )
    ) shouldEqual List(
        new LocalDate(2019, 5, 23),
        new LocalDate(2019, 5, 30),
        new LocalDate(2019, 6, 6),
        new LocalDate(2019, 6, 13)
      )

    ActionCalculator.calculateActionDatesForGivenHolidayStopRequest(
      HolidayStopRequest(
        HolidayStopRequestId(""),
        HolidayStopRequestStartDate(new LocalDate(2019, 5, 17)),
        HolidayStopRequestEndDate(new LocalDate(2019, 6, 20)),
        HolidayStopRequestActionedCount(0),
        SubscriptionName(""),
        gwProductName
      )
    ) shouldEqual List(
        new LocalDate(2019, 5, 23),
        new LocalDate(2019, 5, 30),
        new LocalDate(2019, 6, 6),
        new LocalDate(2019, 6, 13),
        new LocalDate(2019, 6, 20)
      )

  }

}
