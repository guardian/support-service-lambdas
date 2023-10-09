package com.gu.supporter.fulfilment

import java.time.LocalDate

import VoucherBookletFulfilmentDates.apply
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class VoucherBookletFulfilmentDatesSpec extends AnyFlatSpec with Matchers with DateSupport {

  def shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek(
      today: LocalDate,
      expectedDayOfWeek: String,
      expectedDate: LocalDate,
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

  "MONDAY VoucherBookletFulfilmentDates" should "have correct newSubscriptionEarliestStartDate" in {
    apply( /* Wednesday */ "2019-12-04")("Monday").newSubscriptionEarliestStartDate should equalDate("2019-12-30")
    apply( /* Thursday  */ "2019-12-05")("Monday").newSubscriptionEarliestStartDate should equalDate("2019-12-30")
    apply( /* Friday    */ "2019-12-06")("Monday").newSubscriptionEarliestStartDate should equalDate("2019-12-30")
    apply( /* Saturday  */ "2019-12-07")("Monday").newSubscriptionEarliestStartDate should equalDate("2019-12-30")
    apply( /* Sunday    */ "2019-12-08")("Monday").newSubscriptionEarliestStartDate should equalDate("2019-12-30")
    apply( /* Monday    */ "2019-12-09")("Monday").newSubscriptionEarliestStartDate should equalDate("2019-12-30")
    apply( /* Tuesday   */ "2019-12-10")("Monday").newSubscriptionEarliestStartDate should equalDate("2019-12-30")
    apply( /* Wednesday */ "2019-12-11")("Monday").newSubscriptionEarliestStartDate should equalDate("2020-01-06")
    apply( /* Thursday  */ "2019-12-12")("Monday").newSubscriptionEarliestStartDate should equalDate("2020-01-06")
    apply( /* Friday    */ "2019-12-13")("Monday").newSubscriptionEarliestStartDate should equalDate("2020-01-06")
    apply( /* Saturday  */ "2019-12-14")("Monday").newSubscriptionEarliestStartDate should equalDate("2020-01-06")
  }

  "TUESDAY VoucherBookletFulfilmentDates" should "have correct newSubscriptionEarliestStartDate" in {
    apply( /* Wednesday */ "2019-12-04")("Tuesday").newSubscriptionEarliestStartDate should equalDate("2019-12-31")
    apply( /* Thursday  */ "2019-12-05")("Tuesday").newSubscriptionEarliestStartDate should equalDate("2019-12-31")
    apply( /* Friday    */ "2019-12-06")("Tuesday").newSubscriptionEarliestStartDate should equalDate("2019-12-31")
    apply( /* Saturday  */ "2019-12-07")("Tuesday").newSubscriptionEarliestStartDate should equalDate("2019-12-31")
    apply( /* Sunday    */ "2019-12-08")("Tuesday").newSubscriptionEarliestStartDate should equalDate("2019-12-31")
    apply( /* Monday    */ "2019-12-09")("Tuesday").newSubscriptionEarliestStartDate should equalDate("2019-12-31")
    apply( /* Tuesday   */ "2019-12-10")("Tuesday").newSubscriptionEarliestStartDate should equalDate("2019-12-31")
    apply( /* Wednesday */ "2019-12-11")("Tuesday").newSubscriptionEarliestStartDate should equalDate("2020-01-07")
    apply( /* Thursday  */ "2019-12-12")("Tuesday").newSubscriptionEarliestStartDate should equalDate("2020-01-07")
    apply( /* Friday    */ "2019-12-13")("Tuesday").newSubscriptionEarliestStartDate should equalDate("2020-01-07")
    apply( /* Saturday  */ "2019-12-14")("Tuesday").newSubscriptionEarliestStartDate should equalDate("2020-01-07")
  }

  "WEDNESDAY VoucherBookletFulfilmentDates" should "have correct newSubscriptionEarliestStartDate" in {
    apply( /* Wednesday */ "2019-12-04")("Wednesday").newSubscriptionEarliestStartDate should equalDate(
      "2020-01-01",
    )
    apply( /* Thursday  */ "2019-12-05")("Wednesday").newSubscriptionEarliestStartDate should equalDate(
      "2020-01-01",
    )
    apply( /* Friday    */ "2019-12-06")("Wednesday").newSubscriptionEarliestStartDate should equalDate(
      "2020-01-01",
    )
    apply( /* Saturday  */ "2019-12-07")("Wednesday").newSubscriptionEarliestStartDate should equalDate(
      "2020-01-01",
    )
    apply( /* Sunday    */ "2019-12-08")("Wednesday").newSubscriptionEarliestStartDate should equalDate(
      "2020-01-01",
    )
    apply( /* Monday    */ "2019-12-09")("Wednesday").newSubscriptionEarliestStartDate should equalDate(
      "2020-01-01",
    )
    apply( /* Tuesday   */ "2019-12-10")("Wednesday").newSubscriptionEarliestStartDate should equalDate(
      "2020-01-01",
    )
    apply( /* Wednesday */ "2019-12-11")("Wednesday").newSubscriptionEarliestStartDate should equalDate(
      "2020-01-08",
    )
    apply( /* Thursday  */ "2019-12-12")("Wednesday").newSubscriptionEarliestStartDate should equalDate(
      "2020-01-08",
    )
    apply( /* Friday    */ "2019-12-13")("Wednesday").newSubscriptionEarliestStartDate should equalDate(
      "2020-01-08",
    )
    apply( /* Saturday  */ "2019-12-14")("Wednesday").newSubscriptionEarliestStartDate should equalDate(
      "2020-01-08",
    )
  }

  "THURSDAY VoucherBookletFulfilmentDates" should "have correct newSubscriptionEarliestStartDate" in {
    apply( /* Wednesday */ "2019-12-04")("Thursday").newSubscriptionEarliestStartDate should equalDate("2020-01-02")
    apply( /* Thursday  */ "2019-12-05")("Thursday").newSubscriptionEarliestStartDate should equalDate("2020-01-02")
    apply( /* Friday    */ "2019-12-06")("Thursday").newSubscriptionEarliestStartDate should equalDate("2020-01-02")
    apply( /* Saturday  */ "2019-12-07")("Thursday").newSubscriptionEarliestStartDate should equalDate("2020-01-02")
    apply( /* Sunday    */ "2019-12-08")("Thursday").newSubscriptionEarliestStartDate should equalDate("2020-01-02")
    apply( /* Monday    */ "2019-12-09")("Thursday").newSubscriptionEarliestStartDate should equalDate("2020-01-02")
    apply( /* Tuesday   */ "2019-12-10")("Thursday").newSubscriptionEarliestStartDate should equalDate("2020-01-02")
    apply( /* Wednesday */ "2019-12-11")("Thursday").newSubscriptionEarliestStartDate should equalDate("2020-01-09")
    apply( /* Thursday  */ "2019-12-12")("Thursday").newSubscriptionEarliestStartDate should equalDate("2020-01-09")
    apply( /* Friday    */ "2019-12-13")("Thursday").newSubscriptionEarliestStartDate should equalDate("2020-01-09")
    apply( /* Saturday  */ "2019-12-14")("Thursday").newSubscriptionEarliestStartDate should equalDate("2020-01-09")
  }

  "FRIDAY VoucherBookletFulfilmentDates" should "have correct newSubscriptionEarliestStartDate" in {
    apply( /* Wednesday */ "2019-12-04")("Friday").newSubscriptionEarliestStartDate should equalDate("2020-01-03")
    apply( /* Thursday  */ "2019-12-05")("Friday").newSubscriptionEarliestStartDate should equalDate("2020-01-03")
    apply( /* Friday    */ "2019-12-06")("Friday").newSubscriptionEarliestStartDate should equalDate("2020-01-03")
    apply( /* Saturday  */ "2019-12-07")("Friday").newSubscriptionEarliestStartDate should equalDate("2020-01-03")
    apply( /* Sunday    */ "2019-12-08")("Friday").newSubscriptionEarliestStartDate should equalDate("2020-01-03")
    apply( /* Monday    */ "2019-12-09")("Friday").newSubscriptionEarliestStartDate should equalDate("2020-01-03")
    apply( /* Tuesday   */ "2019-12-10")("Friday").newSubscriptionEarliestStartDate should equalDate("2020-01-03")
    apply( /* Wednesday */ "2019-12-11")("Friday").newSubscriptionEarliestStartDate should equalDate("2020-01-10")
    apply( /* Thursday  */ "2019-12-12")("Friday").newSubscriptionEarliestStartDate should equalDate("2020-01-10")
    apply( /* Friday    */ "2019-12-13")("Friday").newSubscriptionEarliestStartDate should equalDate("2020-01-10")
    apply( /* Saturday  */ "2019-12-14")("Friday").newSubscriptionEarliestStartDate should equalDate("2020-01-10")
  }

  "SATURDAY VoucherBookletFulfilmentDates" should "have correct newSubscriptionEarliestStartDate" in {
    apply( /* Wednesday */ "2019-12-04")("Saturday").newSubscriptionEarliestStartDate should equalDate("2020-01-04")
    apply( /* Thursday  */ "2019-12-05")("Saturday").newSubscriptionEarliestStartDate should equalDate("2020-01-04")
    apply( /* Friday    */ "2019-12-06")("Saturday").newSubscriptionEarliestStartDate should equalDate("2020-01-04")
    apply( /* Saturday  */ "2019-12-07")("Saturday").newSubscriptionEarliestStartDate should equalDate("2020-01-04")
    apply( /* Sunday    */ "2019-12-08")("Saturday").newSubscriptionEarliestStartDate should equalDate("2020-01-04")
    apply( /* Monday    */ "2019-12-09")("Saturday").newSubscriptionEarliestStartDate should equalDate("2020-01-04")
    apply( /* Tuesday   */ "2019-12-10")("Saturday").newSubscriptionEarliestStartDate should equalDate("2020-01-04")
    apply( /* Wednesday */ "2019-12-11")("Saturday").newSubscriptionEarliestStartDate should equalDate("2020-01-11")
    apply( /* Thursday  */ "2019-12-12")("Saturday").newSubscriptionEarliestStartDate should equalDate("2020-01-11")
    apply( /* Friday    */ "2019-12-13")("Saturday").newSubscriptionEarliestStartDate should equalDate("2020-01-11")
    apply( /* Saturday  */ "2019-12-14")("Saturday").newSubscriptionEarliestStartDate should equalDate("2020-01-11")
  }

  "SUNDAY VoucherBookletFulfilmentDates" should "have correct newSubscriptionEarliestStartDate" in {
    apply( /* Wednesday */ "2019-12-04")("Sunday").newSubscriptionEarliestStartDate should equalDate("2020-01-05")
    apply( /* Thursday  */ "2019-12-05")("Sunday").newSubscriptionEarliestStartDate should equalDate("2020-01-05")
    apply( /* Friday    */ "2019-12-06")("Sunday").newSubscriptionEarliestStartDate should equalDate("2020-01-05")
    apply( /* Saturday  */ "2019-12-07")("Sunday").newSubscriptionEarliestStartDate should equalDate("2020-01-05")
    apply( /* Sunday    */ "2019-12-08")("Sunday").newSubscriptionEarliestStartDate should equalDate("2020-01-05")
    apply( /* Monday    */ "2019-12-09")("Sunday").newSubscriptionEarliestStartDate should equalDate("2020-01-05")
    apply( /* Tuesday   */ "2019-12-10")("Sunday").newSubscriptionEarliestStartDate should equalDate("2020-01-05")
    apply( /* Wednesday */ "2019-12-11")("Sunday").newSubscriptionEarliestStartDate should equalDate("2020-01-12")
    apply( /* Thursday  */ "2019-12-12")("Sunday").newSubscriptionEarliestStartDate should equalDate("2020-01-12")
    apply( /* Friday    */ "2019-12-13")("Sunday").newSubscriptionEarliestStartDate should equalDate("2020-01-12")
    apply( /* Saturday  */ "2019-12-14")("Sunday").newSubscriptionEarliestStartDate should equalDate("2020-01-12")
  }
}
