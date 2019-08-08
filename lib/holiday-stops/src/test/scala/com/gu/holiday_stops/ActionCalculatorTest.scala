package com.gu.holiday_stops

import java.time.{DayOfWeek, LocalDate}

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.ProductName
import org.scalatest.{FlatSpec, Matchers}

import scala.collection.immutable.ListMap

class ActionCalculatorTest extends FlatSpec with Matchers {

  val gwProductName = ProductName("Guardian Weekly Zone A")

  it should "convert ProductName to a set of constants for that product" in {

    val suspensionConstants = ActionCalculator.suspensionConstantsByProduct(gwProductName)

    suspensionConstants.issueDayOfWeek shouldEqual DayOfWeek.FRIDAY
    suspensionConstants.annualIssueLimit shouldEqual 6
    suspensionConstants.processorRunLeadTimeDays shouldEqual 9

    assertThrows[MatchError] {
      ActionCalculator.suspensionConstantsByProduct(ProductName("blah"))
    }

  }

  it should "calculate first available date for Guardian Weekly" in {

    type Today = LocalDate
    type FirstAvailableDate = LocalDate
    val gwTodayToFirstAvailableDate = ListMap[Today, FirstAvailableDate](
      LocalDate.of(2019, 6,  1) -> LocalDate.of(2019, 6,  8), // first available on Sun
      LocalDate.of(2019, 6,  2) -> LocalDate.of(2019, 6,  8), // first available on Sun
      LocalDate.of(2019, 6,  3) -> LocalDate.of(2019, 6,  8), // first available on Sun
      LocalDate.of(2019, 6,  4) -> LocalDate.of(2019, 6, 15), // jump on Tue, a day before processor run
      LocalDate.of(2019, 6,  5) -> LocalDate.of(2019, 6, 15), // first available on Sun
      LocalDate.of(2019, 6,  6) -> LocalDate.of(2019, 6, 15), // first available on Sun
      LocalDate.of(2019, 6,  7) -> LocalDate.of(2019, 6, 15), // first available on Sun
      LocalDate.of(2019, 6,  8) -> LocalDate.of(2019, 6, 15), // first available on Sun
      LocalDate.of(2019, 6,  9) -> LocalDate.of(2019, 6, 15), // first available on Sun
      LocalDate.of(2019, 6, 10) -> LocalDate.of(2019, 6, 15), // first available on Sun
      LocalDate.of(2019, 6, 11) -> LocalDate.of(2019, 6, 22), // jump on Tue, a day before processor run
      LocalDate.of(2019, 6, 12) -> LocalDate.of(2019, 6, 22), // first available on Sun
      LocalDate.of(2019, 6, 13) -> LocalDate.of(2019, 6, 22), // first available on Sun
      LocalDate.of(2019, 6, 14) -> LocalDate.of(2019, 6, 22), // first available on Sun
      LocalDate.of(2019, 6, 15) -> LocalDate.of(2019, 6, 22), // first available on Sun
      LocalDate.of(2019, 6, 16) -> LocalDate.of(2019, 6, 22), // first available on Sun
      LocalDate.of(2019, 6, 17) -> LocalDate.of(2019, 6, 22), // first available on Sun
      LocalDate.of(2019, 6, 18) -> LocalDate.of(2019, 6, 29), // jump on Tue, a day before processor run
      LocalDate.of(2019, 6, 19) -> LocalDate.of(2019, 6, 29), // first available on Sun
      LocalDate.of(2019, 6, 20) -> LocalDate.of(2019, 6, 29), // first available on Sun
      LocalDate.of(2019, 6, 21) -> LocalDate.of(2019, 6, 29), // first available on Sun
      LocalDate.of(2019, 6, 22) -> LocalDate.of(2019, 6, 29), // first available on Sun
      LocalDate.of(2019, 6, 23) -> LocalDate.of(2019, 6, 29), // first available on Sun
      LocalDate.of(2019, 6, 24) -> LocalDate.of(2019, 6, 29), // first available on Sun
      LocalDate.of(2019, 6, 25) -> LocalDate.of(2019, 7,  6), // jump on Tue, a day before processor run
      LocalDate.of(2019, 6, 26) -> LocalDate.of(2019, 7,  6), // first available on Sun
      LocalDate.of(2019, 6, 27) -> LocalDate.of(2019, 7,  6), // first available on Sun
      LocalDate.of(2019, 6, 28) -> LocalDate.of(2019, 7,  6), // first available on Sun
      LocalDate.of(2019, 6, 29) -> LocalDate.of(2019, 7,  6), // first available on Sun
      LocalDate.of(2019, 6, 30) -> LocalDate.of(2019, 7,  6), // first available on Sun
      LocalDate.of(2019, 7,  1) -> LocalDate.of(2019, 7,  6), // first available on Sun
      LocalDate.of(2019, 7,  2) -> LocalDate.of(2019, 7, 13) // jump on Tue, a day before processor run

    )

    gwTodayToFirstAvailableDate foreach {
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
