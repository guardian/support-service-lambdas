package com.gu.holiday_stops

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest._
import com.gu.salesforce.holiday_stops.SalesforceSFSubscription.SubscriptionName
import org.joda.time.{DateTimeConstants, LocalDate}
import org.scalatest.{FlatSpec, Matchers}

class ActionCalculatorTest extends FlatSpec with Matchers {

  val gwProductName = ProductName("Guardian Weekly Zone A")

  it should "convert ProductName to a set of constants for that product" in {

    val suspensionConstants = ActionCalculator.productNameToSuspensionConstants(gwProductName)

    suspensionConstants.issueDayOfWeek shouldEqual DateTimeConstants.FRIDAY
    suspensionConstants.annualIssueLimit shouldEqual 6
    suspensionConstants.minLeadTimeDays shouldEqual 9

    assertThrows[MatchError] {
      ActionCalculator.productNameToSuspensionConstants(ProductName("blah"))
    }

  }

  it should "calculate the first available date based on ProductName" in {

    val gwInputsAndExpected = Map(
      new LocalDate(2019, 6, 10) -> new LocalDate(2019, 6, 15),
      new LocalDate(2019, 6, 11) -> new LocalDate(2019, 6, 15),
      new LocalDate(2019, 6, 12) -> new LocalDate(2019, 6, 22),
      new LocalDate(2019, 6, 13) -> new LocalDate(2019, 6, 22),
      new LocalDate(2019, 6, 14) -> new LocalDate(2019, 6, 22),
      new LocalDate(2019, 6, 15) -> new LocalDate(2019, 6, 22),
      new LocalDate(2019, 6, 16) -> new LocalDate(2019, 6, 22),
      new LocalDate(2019, 6, 17) -> new LocalDate(2019, 6, 22),
      new LocalDate(2019, 6, 18) -> new LocalDate(2019, 6, 22),
      new LocalDate(2019, 6, 19) -> new LocalDate(2019, 6, 29),
    )

    gwInputsAndExpected foreach {
      case (today, expected) =>
        ActionCalculator.getProductSpecifics(gwProductName, today).firstAvailableDate shouldEqual expected
    }

  }

  it should "calculate the next target day of the week given a date" in {

    val gwInputsAndExpected = Map(
      DateTimeConstants.THURSDAY -> new LocalDate(2019, 6, 20),
      DateTimeConstants.FRIDAY -> new LocalDate(2019, 6, 21),
      DateTimeConstants.SATURDAY -> new LocalDate(2019, 6, 15),
    )

    gwInputsAndExpected foreach {
      case (dayOfWeek, expected) =>
        ActionCalculator.findNextTargetDayOfWeek(new LocalDate(2019, 6, 14), dayOfWeek) shouldEqual expected
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
