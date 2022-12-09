package com.gu.supporter.fulfilment

import java.time.LocalDate

import com.gu.supporter.fulfilment.DigitalVoucherFulfilmentDates.apply
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class DigitalVoucherFulfilmentDatesSpec extends AnyFlatSpec with Matchers with DateSupport {

  private def shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek(
      today: LocalDate,
      expectedDayOfWeek: String,
      expectedDate: LocalDate,
  ) = {
    val result = apply(today)
    result.values.flatMap(_.holidayStopProcessorTargetDate) shouldBe List(expectedDate)
    result(expectedDayOfWeek).holidayStopProcessorTargetDate.get should equalDate(expectedDate)
  }

  private def shouldHaveCorrectEarliestHolidayStopAvailableDate(today: LocalDate, expectedDate: LocalDate) =
    apply(today).values
      .map(_.holidayStopFirstAvailableDate)
      .toList
      .distinct shouldBe List(expectedDate)

  it should "calculate holidayStopProcessorTargetDate" in {
    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-02", "Monday", "2019-12-03")
    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-03", "Tuesday", "2019-12-04")
    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-04", "Wednesday", "2019-12-05")
    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-05", "Thursday", "2019-12-06")
    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-06", "Friday", "2019-12-07")
    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-07", "Saturday", "2019-12-08")
    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-08", "Sunday", "2019-12-09")
    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-09", "Monday", "2019-12-10")
    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-10", "Tuesday", "2019-12-11")
    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-11", "Wednesday", "2019-12-12")
    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-12", "Thursday", "2019-12-13")
    shouldHaveOnlyOneHolidayStopProcessorTargetDateOnTheCorrectDayOfWeek("2019-12-13", "Friday", "2019-12-14")
  }

  it should "have correct earliest holiday-stop available date" in {
    shouldHaveCorrectEarliestHolidayStopAvailableDate("2019-12-02", "2019-12-04")
    shouldHaveCorrectEarliestHolidayStopAvailableDate("2019-12-03", "2019-12-05")
    shouldHaveCorrectEarliestHolidayStopAvailableDate("2019-12-04", "2019-12-06")
    shouldHaveCorrectEarliestHolidayStopAvailableDate("2019-12-05", "2019-12-07")
    shouldHaveCorrectEarliestHolidayStopAvailableDate("2019-12-06", "2019-12-08")
    shouldHaveCorrectEarliestHolidayStopAvailableDate("2019-12-07", "2019-12-09")
    shouldHaveCorrectEarliestHolidayStopAvailableDate("2019-12-08", "2019-12-10")
    shouldHaveCorrectEarliestHolidayStopAvailableDate("2019-12-09", "2019-12-11")
    shouldHaveCorrectEarliestHolidayStopAvailableDate("2019-12-10", "2019-12-12")
    shouldHaveCorrectEarliestHolidayStopAvailableDate("2019-12-11", "2019-12-13")
    shouldHaveCorrectEarliestHolidayStopAvailableDate("2019-12-12", "2019-12-14")
    shouldHaveCorrectEarliestHolidayStopAvailableDate("2019-12-13", "2019-12-15")
  }

  "MONDAY DigitalVoucherFulfilmentDates" should "have correct newSubscriptionEarliestStartDate" in {
    apply( /* Sunday */ "2020-07-26")("Monday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-03")
    apply( /* Monday */ "2020-07-27")("Monday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-10")
    apply( /* Tuesday */ "2020-07-28")("Monday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-10")
    apply( /* Wednesday */ "2020-07-29")("Monday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-10")
    apply( /* Thursday */ "2020-07-30")("Monday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-10")
    apply( /* Friday */ "2020-07-31")("Monday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-10")
    apply( /* Saturday */ "2020-08-01")("Monday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-10")
    apply( /* Sunday */ "2020-08-02")("Monday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-10")
    apply( /* Monday */ "2020-08-03")("Monday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-17")
  }

  "TUESDAY DigitalVoucherFulfilmentDates" should "have correct newSubscriptionEarliestStartDate" in {
    apply( /* Sunday */ "2020-07-26")("Tuesday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-04")
    apply( /* Monday */ "2020-07-27")("Tuesday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-11")
    apply( /* Tuesday */ "2020-07-28")("Tuesday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-11")
    apply( /* Wednesday */ "2020-07-29")("Tuesday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-11")
    apply( /* Thursday */ "2020-07-30")("Tuesday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-11")
    apply( /* Friday */ "2020-07-31")("Tuesday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-11")
    apply( /* Saturday */ "2020-08-01")("Tuesday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-11")
    apply( /* Sunday */ "2020-08-02")("Tuesday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-11")
    apply( /* Monday */ "2020-08-03")("Tuesday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-18")
  }

  "WEDNESDAY DigitalVoucherFulfilmentDates" should "have correct newSubscriptionEarliestStartDate" in {
    apply( /* Sunday */ "2020-07-26")("Wednesday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-05")
    apply( /* Monday */ "2020-07-27")("Wednesday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-12")
    apply( /* Tuesday */ "2020-07-28")("Wednesday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-12")
    apply( /* Wednesday */ "2020-07-29")("Wednesday").newSubscriptionEarliestStartDate.get should equalDate(
      "2020-08-12",
    )
    apply( /* Thursday */ "2020-07-30")("Wednesday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-12")
    apply( /* Friday */ "2020-07-31")("Wednesday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-12")
    apply( /* Saturday */ "2020-08-01")("Wednesday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-12")
    apply( /* Sunday */ "2020-08-02")("Wednesday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-12")
    apply( /* Monday */ "2020-08-03")("Wednesday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-19")
  }

  "THURSDAY DigitalVoucherFulfilmentDates" should "have correct newSubscriptionEarliestStartDate" in {
    apply( /* Sunday */ "2020-07-26")("Thursday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-06")
    apply( /* Monday */ "2020-07-27")("Thursday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-06")
    apply( /* Tuesday */ "2020-07-28")("Thursday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-06")
    apply( /* Wednesday */ "2020-07-29")("Thursday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-06")
    apply( /* Thursday */ "2020-07-30")("Thursday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-13")
    apply( /* Friday */ "2020-07-31")("Thursday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-13")
    apply( /* Saturday */ "2020-08-01")("Thursday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-13")
    apply( /* Sunday */ "2020-08-02")("Thursday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-13")
    apply( /* Monday */ "2020-08-03")("Thursday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-13")
  }

  "FRIDAY DigitalVoucherFulfilmentDates" should "have correct newSubscriptionEarliestStartDate" in {
    apply( /* Sunday */ "2020-07-26")("Friday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-07")
    apply( /* Monday */ "2020-07-27")("Friday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-07")
    apply( /* Tuesday */ "2020-07-28")("Friday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-07")
    apply( /* Wednesday */ "2020-07-29")("Friday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-07")
    apply( /* Thursday */ "2020-07-30")("Friday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-14")
    apply( /* Friday */ "2020-07-31")("Friday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-14")
    apply( /* Saturday */ "2020-08-01")("Friday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-14")
    apply( /* Sunday */ "2020-08-02")("Friday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-14")
    apply( /* Monday */ "2020-08-03")("Friday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-14")
  }

  "SATURDAY DigitalVoucherFulfilmentDates" should "have correct newSubscriptionEarliestStartDate" in {
    apply( /* Sunday */ "2020-07-26")("Saturday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-08")
    apply( /* Monday */ "2020-07-27")("Saturday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-08")
    apply( /* Tuesday */ "2020-07-28")("Saturday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-08")
    apply( /* Wednesday */ "2020-07-29")("Saturday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-08")
    apply( /* Thursday */ "2020-07-30")("Saturday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-15")
    apply( /* Friday */ "2020-07-31")("Saturday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-15")
    apply( /* Saturday */ "2020-08-01")("Saturday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-15")
    apply( /* Sunday */ "2020-08-02")("Saturday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-15")
    apply( /* Monday */ "2020-08-03")("Saturday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-15")
  }

  "SUNDAY DigitalVoucherFulfilmentDates" should "have correct newSubscriptionEarliestStartDate" in {
    apply( /* Sunday */ "2020-07-26")("Sunday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-09")
    apply( /* Monday */ "2020-07-27")("Sunday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-09")
    apply( /* Tuesday */ "2020-07-28")("Sunday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-09")
    apply( /* Wednesday */ "2020-07-29")("Sunday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-09")
    apply( /* Thursday */ "2020-07-30")("Sunday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-16")
    apply( /* Friday */ "2020-07-31")("Sunday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-16")
    apply( /* Saturday */ "2020-08-01")("Sunday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-16")
    apply( /* Sunday */ "2020-08-02")("Sunday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-16")
    apply( /* Monday */ "2020-08-03")("Sunday").newSubscriptionEarliestStartDate.get should equalDate("2020-08-16")
  }
}
