package com.gu.holiday_stops

import java.time.{DayOfWeek, LocalDate}

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.ProductName
import org.scalatest.{FlatSpec, Matchers}

class ActionCalculatorTest extends FlatSpec with Matchers {

  val gwProductName = ProductName("Guardian Weekly Zone A")

  it should "convert ProductName to a set of constants for that product" in {

    val suspensionConstants = ActionCalculator.suspensionConstantsByProduct(gwProductName)

    suspensionConstants.issueDayOfWeek shouldEqual DayOfWeek.FRIDAY
    suspensionConstants.annualIssueLimit shouldEqual 6
    suspensionConstants.minLeadTimeDays shouldEqual 9

    assertThrows[MatchError] {
      ActionCalculator.suspensionConstantsByProduct(ProductName("blah"))
    }

  }

  it should "calculate the first available date based on ProductName" in {

    val gwInputsAndExpected = Map(
      LocalDate.of(2019, 6, 10) -> LocalDate.of(2019, 6, 15),
      LocalDate.of(2019, 6, 11) -> LocalDate.of(2019, 6, 15),
      LocalDate.of(2019, 6, 12) -> LocalDate.of(2019, 6, 22),
      LocalDate.of(2019, 6, 13) -> LocalDate.of(2019, 6, 22),
      LocalDate.of(2019, 6, 14) -> LocalDate.of(2019, 6, 22),
      LocalDate.of(2019, 6, 15) -> LocalDate.of(2019, 6, 22),
      LocalDate.of(2019, 6, 16) -> LocalDate.of(2019, 6, 22),
      LocalDate.of(2019, 6, 17) -> LocalDate.of(2019, 6, 22),
      LocalDate.of(2019, 6, 18) -> LocalDate.of(2019, 6, 22),
      LocalDate.of(2019, 6, 19) -> LocalDate.of(2019, 6, 29),
    )

    gwInputsAndExpected foreach {
      case (today, expected) =>
        ActionCalculator.getProductSpecifics(gwProductName, today).firstAvailableDate shouldEqual expected
    }

  }

  it should "calculate the next target day of the week given a date" in {

    val gwInputsAndExpected = Map(
      DayOfWeek.THURSDAY -> LocalDate.of(2019, 6, 20),
      DayOfWeek.FRIDAY -> LocalDate.of(2019, 6, 21),
      DayOfWeek.SATURDAY -> LocalDate.of(2019, 6, 15),
    )

    gwInputsAndExpected foreach {
      case (dayOfWeek, expected) =>
        ActionCalculator.findNextTargetDayOfWeek(LocalDate.of(2019, 6, 14), dayOfWeek) shouldEqual expected
    }

  }

  it should "correctly list the action dates for given Holiday Stop Request" in {

    ActionCalculator.publicationDatesToBeStopped(
      fromInclusive = LocalDate.of(2019, 5, 18),
      toInclusive = LocalDate.of(2019, 6, 20),
      productName = gwProductName
    ) shouldEqual List(
        LocalDate.of(2019, 5, 24),
        LocalDate.of(2019, 5, 31),
        LocalDate.of(2019, 6, 7),
        LocalDate.of(2019, 6, 14)
      )

    ActionCalculator.publicationDatesToBeStopped(
      fromInclusive = LocalDate.of(2019, 5, 18),
      toInclusive = LocalDate.of(2019, 6, 21),
      productName = gwProductName
    ) shouldEqual List(
        LocalDate.of(2019, 5, 24),
        LocalDate.of(2019, 5, 31),
        LocalDate.of(2019, 6, 7),
        LocalDate.of(2019, 6, 14),
        LocalDate.of(2019, 6, 21)
      )

  }

}
