package com.gu.supporter.fulfilment

import java.time.LocalDate

import org.scalatest.{FlatSpec, Matchers}

class VoucherBookletFulfilmentDatesSpec extends FlatSpec with Matchers with DateSupport {

  def shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek(
    today: LocalDate,
    expectedDayOfWeek: String,
    expectedDate: LocalDate
  ) = {
    val result = VoucherBookletFulfilmentDates(today)
    result.values.flatMap(_.holidayStopProcessorTargetDate) shouldBe List(expectedDate)
    result(expectedDayOfWeek).holidayStopProcessorTargetDate.get should equalDate(expectedDate)
  }

  it should "calculate holidayStopProcessorTargetDate" in {

    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-02", "Monday", "2019-12-02")
    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-03", "Tuesday", "2019-12-03")
    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-04", "Wednesday", "2019-12-04")
    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-05", "Thursday", "2019-12-05")
    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-06", "Friday", "2019-12-06")
    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-07", "Saturday", "2019-12-07")
    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-08", "Sunday", "2019-12-08")
    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-09", "Monday", "2019-12-09")
    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-10", "Tuesday", "2019-12-10")
    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-11", "Wednesday", "2019-12-11")
    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-12", "Thursday", "2019-12-12")
    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-13", "Friday", "2019-12-13")

  }

}
