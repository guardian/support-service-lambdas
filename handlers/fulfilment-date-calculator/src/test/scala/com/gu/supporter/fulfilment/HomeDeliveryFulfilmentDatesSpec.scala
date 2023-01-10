package com.gu.supporter.fulfilment

import java.time.LocalDate

import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class HomeDeliveryFulfilmentDatesSpec extends AnyFlatSpec with Matchers with DateSupport {

  def apply(today: LocalDate) = HomeDeliveryFulfilmentDates.apply(today)(
    BankHolidays(Nil), // TODO reuse sampleBankHolidays from LocalDateHelpersSpec with some test cases below
  )

  "HomeDeliveryFulfilmentDates" should "should contain correct holidayStopProcessorTargetDate(s)" in {
    apply( /* Wednesday */ "2019-12-04").values.flatMap(_.holidayStopProcessorTargetDate) shouldBe List[LocalDate](
      "2019-12-06",
    )
    apply( /* Thursday  */ "2019-12-05").values
      .flatMap(_.holidayStopProcessorTargetDate) shouldBe List[LocalDate]("2019-12-09", "2019-12-07", "2019-12-08")
    apply( /* Friday    */ "2019-12-06").values.flatMap(_.holidayStopProcessorTargetDate) shouldBe Nil
    apply( /* Saturday  */ "2019-12-07").values.flatMap(_.holidayStopProcessorTargetDate) shouldBe Nil
    apply( /* Sunday    */ "2019-12-08").values.flatMap(_.holidayStopProcessorTargetDate) shouldBe List[LocalDate](
      "2019-12-10",
    )
    apply( /* Monday    */ "2019-12-09").values.flatMap(_.holidayStopProcessorTargetDate) shouldBe List[LocalDate](
      "2019-12-11",
    )
    apply( /* Tuesday   */ "2019-12-10").values.flatMap(_.holidayStopProcessorTargetDate) shouldBe List[LocalDate](
      "2019-12-12",
    )
    apply( /* Wednesday */ "2019-12-11").values.flatMap(_.holidayStopProcessorTargetDate) shouldBe List[LocalDate](
      "2019-12-13",
    )
    apply( /* Thursday  */ "2019-12-12").values
      .flatMap(_.holidayStopProcessorTargetDate) shouldBe List[LocalDate]("2019-12-16", "2019-12-14", "2019-12-15")
    apply( /* Friday    */ "2019-12-13").values.flatMap(_.holidayStopProcessorTargetDate) shouldBe Nil
    apply( /* Saturday  */ "2019-12-14").values.flatMap(_.holidayStopProcessorTargetDate) shouldBe Nil
    apply( /* Sunday    */ "2019-12-15").values.flatMap(_.holidayStopProcessorTargetDate) shouldBe List[LocalDate](
      "2019-12-17",
    )

    // TODO add some bank holiday examples
  }

  "MONDAY HomeDeliveryFulfilmentDates" should "have correct holidayStopFirstAvailableDate" in {
    apply( /* Tuesday   */ "2019-12-03")("Monday").holidayStopFirstAvailableDate should equalDate("2019-12-09")
    apply( /* Wednesday */ "2019-12-04")("Monday").holidayStopFirstAvailableDate should equalDate("2019-12-09")
    apply( /* Thursday  */ "2019-12-05")("Monday").holidayStopFirstAvailableDate should equalDate("2019-12-16")
    apply( /* Friday    */ "2019-12-06")("Monday").holidayStopFirstAvailableDate should equalDate("2019-12-16")
    apply( /* Saturday  */ "2019-12-07")("Monday").holidayStopFirstAvailableDate should equalDate("2019-12-16")
    apply( /* Sunday    */ "2019-12-08")("Monday").holidayStopFirstAvailableDate should equalDate("2019-12-16")
    apply( /* Monday    */ "2019-12-09")("Monday").holidayStopFirstAvailableDate should equalDate("2019-12-16")
    apply( /* Tuesday   */ "2019-12-10")("Monday").holidayStopFirstAvailableDate should equalDate("2019-12-16")
    apply( /* Wednesday */ "2019-12-11")("Monday").holidayStopFirstAvailableDate should equalDate("2019-12-16")
    apply( /* Thursday  */ "2019-12-12")("Monday").holidayStopFirstAvailableDate should equalDate("2019-12-23")
    apply( /* Friday    */ "2019-12-13")("Monday").holidayStopFirstAvailableDate should equalDate("2019-12-23")
  }

  "TUESDAY HomeDeliveryFulfilmentDates" should "have correct holidayStopFirstAvailableDate" in {
    apply( /* Friday    */ "2019-12-06")("Tuesday").holidayStopFirstAvailableDate should equalDate("2019-12-10")
    apply( /* Saturday  */ "2019-12-07")("Tuesday").holidayStopFirstAvailableDate should equalDate("2019-12-10")
    apply( /* Sunday    */ "2019-12-08")("Tuesday").holidayStopFirstAvailableDate should equalDate("2019-12-17")
    apply( /* Monday    */ "2019-12-09")("Tuesday").holidayStopFirstAvailableDate should equalDate("2019-12-17")
    apply( /* Tuesday   */ "2019-12-10")("Tuesday").holidayStopFirstAvailableDate should equalDate("2019-12-17")
    apply( /* Wednesday */ "2019-12-11")("Tuesday").holidayStopFirstAvailableDate should equalDate("2019-12-17")
    apply( /* Thursday  */ "2019-12-12")("Tuesday").holidayStopFirstAvailableDate should equalDate("2019-12-17")
    apply( /* Friday    */ "2019-12-13")("Tuesday").holidayStopFirstAvailableDate should equalDate("2019-12-17")
    apply( /* Saturday  */ "2019-12-14")("Tuesday").holidayStopFirstAvailableDate should equalDate("2019-12-17")
    apply( /* Sunday    */ "2019-12-15")("Tuesday").holidayStopFirstAvailableDate should equalDate("2019-12-24")
    apply( /* Monday    */ "2019-12-16")("Tuesday").holidayStopFirstAvailableDate should equalDate("2019-12-24")
  }

  "WEDNESDAY HomeDeliveryFulfilmentDates" should "have correct holidayStopFirstAvailableDate" in {
    apply( /* Saturday  */ "2019-12-07")("Wednesday").holidayStopFirstAvailableDate should equalDate("2019-12-11")
    apply( /* Sunday    */ "2019-12-08")("Wednesday").holidayStopFirstAvailableDate should equalDate("2019-12-11")
    apply( /* Monday    */ "2019-12-09")("Wednesday").holidayStopFirstAvailableDate should equalDate("2019-12-18")
    apply( /* Tuesday   */ "2019-12-10")("Wednesday").holidayStopFirstAvailableDate should equalDate("2019-12-18")
    apply( /* Wednesday */ "2019-12-11")("Wednesday").holidayStopFirstAvailableDate should equalDate("2019-12-18")
    apply( /* Thursday  */ "2019-12-12")("Wednesday").holidayStopFirstAvailableDate should equalDate("2019-12-18")
    apply( /* Friday    */ "2019-12-13")("Wednesday").holidayStopFirstAvailableDate should equalDate("2019-12-18")
    apply( /* Saturday  */ "2019-12-14")("Wednesday").holidayStopFirstAvailableDate should equalDate("2019-12-18")
    apply( /* Sunday    */ "2019-12-15")("Wednesday").holidayStopFirstAvailableDate should equalDate("2019-12-18")
    apply( /* Monday    */ "2019-12-16")("Wednesday").holidayStopFirstAvailableDate should equalDate("2019-12-25")
    apply( /* Tuesday   */ "2019-12-17")("Wednesday").holidayStopFirstAvailableDate should equalDate("2019-12-25")
  }

  "THURSDAY HomeDeliveryFulfilmentDates" should "have correct holidayStopFirstAvailableDate" in {
    apply( /* Sunday    */ "2019-12-08")("Thursday").holidayStopFirstAvailableDate should equalDate("2019-12-12")
    apply( /* Monday    */ "2019-12-09")("Thursday").holidayStopFirstAvailableDate should equalDate("2019-12-12")
    apply( /* Tuesday   */ "2019-12-10")("Thursday").holidayStopFirstAvailableDate should equalDate("2019-12-19")
    apply( /* Wednesday */ "2019-12-11")("Thursday").holidayStopFirstAvailableDate should equalDate("2019-12-19")
    apply( /* Thursday  */ "2019-12-12")("Thursday").holidayStopFirstAvailableDate should equalDate("2019-12-19")
    apply( /* Friday    */ "2019-12-13")("Thursday").holidayStopFirstAvailableDate should equalDate("2019-12-19")
    apply( /* Saturday  */ "2019-12-14")("Thursday").holidayStopFirstAvailableDate should equalDate("2019-12-19")
    apply( /* Sunday    */ "2019-12-15")("Thursday").holidayStopFirstAvailableDate should equalDate("2019-12-19")
    apply( /* Monday    */ "2019-12-16")("Thursday").holidayStopFirstAvailableDate should equalDate("2019-12-19")
    apply( /* Tuesday   */ "2019-12-17")("Thursday").holidayStopFirstAvailableDate should equalDate("2019-12-26")
    apply( /* Wednesday */ "2019-12-18")("Thursday").holidayStopFirstAvailableDate should equalDate("2019-12-26")
  }

  "FRIDAY HomeDeliveryFulfilmentDates" should "have correct holidayStopFirstAvailableDate" in {
    apply( /* Monday    */ "2019-12-09")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-13")
    apply( /* Tuesday   */ "2019-12-10")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-13")
    apply( /* Thursday  */ "2019-12-12")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-20")
    apply( /* Wednesday */ "2019-12-11")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-20")
    apply( /* Friday    */ "2019-12-13")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-20")
    apply( /* Saturday  */ "2019-12-14")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-20")
    apply( /* Sunday    */ "2019-12-15")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-20")
    apply( /* Monday    */ "2019-12-16")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-20")
    apply( /* Tuesday   */ "2019-12-17")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-20")
    apply( /* Wednesday */ "2019-12-18")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-27")
    apply( /* Thursday  */ "2019-12-19")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-27")
  }

  "SATURDAY HomeDeliveryFulfilmentDates" should "have correct holidayStopFirstAvailableDate" in {
    apply( /* Tuesday   */ "2019-12-10")("Saturday").holidayStopFirstAvailableDate should equalDate("2019-12-14")
    apply( /* Wednesday */ "2019-12-11")("Saturday").holidayStopFirstAvailableDate should equalDate("2019-12-14")
    apply( /* Thursday  */ "2019-12-12")("Saturday").holidayStopFirstAvailableDate should equalDate("2019-12-21")
    apply( /* Friday    */ "2019-12-13")("Saturday").holidayStopFirstAvailableDate should equalDate("2019-12-21")
    apply( /* Saturday  */ "2019-12-14")("Saturday").holidayStopFirstAvailableDate should equalDate("2019-12-21")
    apply( /* Sunday    */ "2019-12-15")("Saturday").holidayStopFirstAvailableDate should equalDate("2019-12-21")
    apply( /* Monday    */ "2019-12-16")("Saturday").holidayStopFirstAvailableDate should equalDate("2019-12-21")
    apply( /* Tuesday   */ "2019-12-17")("Saturday").holidayStopFirstAvailableDate should equalDate("2019-12-21")
    apply( /* Wednesday */ "2019-12-18")("Saturday").holidayStopFirstAvailableDate should equalDate("2019-12-21")
    apply( /* Thursday  */ "2019-12-19")("Saturday").holidayStopFirstAvailableDate should equalDate("2019-12-28")
    apply( /* Friday    */ "2019-12-20")("Saturday").holidayStopFirstAvailableDate should equalDate("2019-12-28")
  }

  "SUNDAY HomeDeliveryFulfilmentDates" should "have correct holidayStopFirstAvailableDate" in {
    apply( /* Tuesday   */ "2019-12-10")("Sunday").holidayStopFirstAvailableDate should equalDate("2019-12-15")
    apply( /* Wednesday */ "2019-12-11")("Sunday").holidayStopFirstAvailableDate should equalDate("2019-12-15")
    apply( /* Thursday  */ "2019-12-12")("Sunday").holidayStopFirstAvailableDate should equalDate("2019-12-22")
    apply( /* Friday    */ "2019-12-13")("Sunday").holidayStopFirstAvailableDate should equalDate("2019-12-22")
    apply( /* Saturday  */ "2019-12-14")("Sunday").holidayStopFirstAvailableDate should equalDate("2019-12-22")
    apply( /* Sunday    */ "2019-12-15")("Sunday").holidayStopFirstAvailableDate should equalDate("2019-12-22")
    apply( /* Monday    */ "2019-12-16")("Sunday").holidayStopFirstAvailableDate should equalDate("2019-12-22")
    apply( /* Tuesday   */ "2019-12-17")("Sunday").holidayStopFirstAvailableDate should equalDate("2019-12-22")
    apply( /* Wednesday */ "2019-12-18")("Sunday").holidayStopFirstAvailableDate should equalDate("2019-12-22")
    apply( /* Thursday  */ "2019-12-19")("Sunday").holidayStopFirstAvailableDate should equalDate("2019-12-29")
    apply( /* Friday    */ "2019-12-20")("Sunday").holidayStopFirstAvailableDate should equalDate("2019-12-29")
  }

  "MONDAY HomeDeliveryFulfilmentDates" should "have correct deliveryAddressChangeEffectiveDate" in {
    apply( /* Wednesday */ "2019-12-04")("Monday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-09")
    apply( /* Thursday  */ "2019-12-05")("Monday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-09")
    apply( /* Friday    */ "2019-12-06")("Monday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-16")
    apply( /* Saturday  */ "2019-12-07")("Monday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-16")
    apply( /* Sunday    */ "2019-12-08")("Monday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-16")
    apply( /* Monday    */ "2019-12-09")("Monday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-16")
    apply( /* Tuesday   */ "2019-12-10")("Monday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-16")
    apply( /* Wednesday */ "2019-12-11")("Monday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-16")
    apply( /* Thursday  */ "2019-12-12")("Monday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-16")
    apply( /* Friday    */ "2019-12-13")("Monday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-23")
    apply( /* Saturday  */ "2019-12-14")("Monday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-23")
  }

  "TUESDAY HomeDeliveryFulfilmentDates" should "have correct deliveryAddressChangeEffectiveDate" in {
    apply( /* Saturday  */ "2019-12-07")("Tuesday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-10",
    )
    apply( /* Sunday    */ "2019-12-08")("Tuesday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-10",
    )
    apply( /* Monday    */ "2019-12-09")("Tuesday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-17",
    )
    apply( /* Tuesday   */ "2019-12-10")("Tuesday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-17",
    )
    apply( /* Wednesday */ "2019-12-11")("Tuesday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-17",
    )
    apply( /* Thursday  */ "2019-12-12")("Tuesday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-17",
    )
    apply( /* Friday    */ "2019-12-13")("Tuesday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-17",
    )
    apply( /* Saturday  */ "2019-12-14")("Tuesday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-17",
    )
    apply( /* Sunday    */ "2019-12-15")("Tuesday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-17",
    )
    apply( /* Monday    */ "2019-12-16")("Tuesday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-24",
    )
    apply( /* Tuesday   */ "2019-12-17")("Tuesday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-24",
    )
  }

  "WEDNESDAY HomeDeliveryFulfilmentDates" should "have correct deliveryAddressChangeEffectiveDate" in {
    apply( /* Sunday    */ "2019-12-01")("Wednesday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-04",
    )
    apply( /* Monday    */ "2019-12-02")("Wednesday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-04",
    )
    apply( /* Tuesday   */ "2019-12-03")("Wednesday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-11",
    )
    apply( /* Wednesday */ "2019-12-04")("Wednesday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-11",
    )
    apply( /* Thursday  */ "2019-12-05")("Wednesday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-11",
    )
    apply( /* Friday    */ "2019-12-06")("Wednesday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-11",
    )
    apply( /* Saturday  */ "2019-12-07")("Wednesday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-11",
    )
    apply( /* Sunday    */ "2019-12-08")("Wednesday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-11",
    )
    apply( /* Monday    */ "2019-12-09")("Wednesday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-11",
    )
    apply( /* Tuesday   */ "2019-12-10")("Wednesday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-18",
    )
    apply( /* Wednesday */ "2019-12-11")("Wednesday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-18",
    )
  }

  "THURSDAY HomeDeliveryFulfilmentDates" should "have correct deliveryAddressChangeEffectiveDate" in {
    apply( /* Monday    */ "2019-12-02")("Thursday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-05",
    )
    apply( /* Tuesday   */ "2019-12-03")("Thursday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-05",
    )
    apply( /* Wednesday */ "2019-12-04")("Thursday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-12",
    )
    apply( /* Thursday  */ "2019-12-05")("Thursday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-12",
    )
    apply( /* Friday    */ "2019-12-06")("Thursday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-12",
    )
    apply( /* Saturday  */ "2019-12-07")("Thursday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-12",
    )
    apply( /* Sunday    */ "2019-12-08")("Thursday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-12",
    )
    apply( /* Monday    */ "2019-12-09")("Thursday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-12",
    )
    apply( /* Tuesday   */ "2019-12-10")("Thursday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-12",
    )
    apply( /* Wednesday */ "2019-12-11")("Thursday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-19",
    )
    apply( /* Thursday  */ "2019-12-12")("Thursday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-19",
    )
  }

  "FRIDAY HomeDeliveryFulfilmentDates" should "have correct deliveryAddressChangeEffectiveDate" in {
    apply( /* Tuesday   */ "2019-12-03")("Friday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-06")
    apply( /* Wednesday */ "2019-12-04")("Friday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-06")
    apply( /* Thursday  */ "2019-12-05")("Friday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-13")
    apply( /* Friday    */ "2019-12-06")("Friday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-13")
    apply( /* Saturday  */ "2019-12-07")("Friday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-13")
    apply( /* Sunday    */ "2019-12-08")("Friday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-13")
    apply( /* Monday    */ "2019-12-09")("Friday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-13")
    apply( /* Tuesday   */ "2019-12-10")("Friday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-13")
    apply( /* Wednesday */ "2019-12-11")("Friday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-13")
    apply( /* Thursday  */ "2019-12-12")("Friday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-20")
    apply( /* Friday    */ "2019-12-13")("Friday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-20")
  }

  "SATURDAY HomeDeliveryFulfilmentDates" should "have correct deliveryAddressChangeEffectiveDate" in {
    apply( /* Wednesday */ "2019-12-04")("Saturday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-07",
    )
    apply( /* Thursday  */ "2019-12-05")("Saturday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-07",
    )
    apply( /* Friday    */ "2019-12-06")("Saturday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-14",
    )
    apply( /* Saturday  */ "2019-12-07")("Saturday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-14",
    )
    apply( /* Sunday    */ "2019-12-08")("Saturday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-14",
    )
    apply( /* Monday    */ "2019-12-09")("Saturday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-14",
    )
    apply( /* Tuesday   */ "2019-12-10")("Saturday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-14",
    )
    apply( /* Wednesday */ "2019-12-11")("Saturday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-14",
    )
    apply( /* Thursday  */ "2019-12-12")("Saturday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-14",
    )
    apply( /* Friday    */ "2019-12-13")("Saturday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-21",
    )
    apply( /* Saturday  */ "2019-12-14")("Saturday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-21",
    )
  }

  "SUNDAY HomeDeliveryFulfilmentDates" should "have correct deliveryAddressChangeEffectiveDate" in {
    apply( /* Wednesday */ "2019-12-04")("Sunday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-08")
    apply( /* Thursday  */ "2019-12-05")("Sunday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-08")
    apply( /* Friday    */ "2019-12-06")("Sunday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-15")
    apply( /* Saturday  */ "2019-12-07")("Sunday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-15")
    apply( /* Sunday    */ "2019-12-08")("Sunday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-15")
    apply( /* Monday    */ "2019-12-09")("Sunday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-15")
    apply( /* Tuesday   */ "2019-12-10")("Sunday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-15")
    apply( /* Wednesday */ "2019-12-11")("Sunday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-15")
    apply( /* Thursday  */ "2019-12-12")("Sunday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-15")
    apply( /* Friday    */ "2019-12-13")("Sunday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-22")
    apply( /* Saturday  */ "2019-12-14")("Sunday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-22")
  }

  "MONDAY HomeDeliveryFulfilmentDates" should "have correct newSubscriptionEarliestStartDate" in {
    apply( /* Wednesday */ "2019-12-04")("Monday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-09")
    apply( /* Thursday  */ "2019-12-05")("Monday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-16")
    apply( /* Friday    */ "2019-12-06")("Monday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-16")
    apply( /* Saturday  */ "2019-12-07")("Monday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-16")
    apply( /* Sunday    */ "2019-12-08")("Monday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-16")
    apply( /* Monday    */ "2019-12-09")("Monday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-16")
    apply( /* Tuesday   */ "2019-12-10")("Monday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-16")
    apply( /* Wednesday */ "2019-12-11")("Monday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-16")
    apply( /* Thursday  */ "2019-12-12")("Monday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-23")
    apply( /* Friday    */ "2019-12-13")("Monday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-23")
    apply( /* Saturday  */ "2019-12-14")("Monday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-23")
  }

  "TUESDAY HomeDeliveryFulfilmentDates" should "have correct newSubscriptionEarliestStartDate" in {
    apply( /* Saturday  */ "2019-12-07")("Tuesday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-17")
    apply( /* Sunday    */ "2019-12-08")("Tuesday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-17")
    apply( /* Monday    */ "2019-12-09")("Tuesday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-17")
    apply( /* Tuesday   */ "2019-12-10")("Tuesday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-17")
    apply( /* Wednesday */ "2019-12-11")("Tuesday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-17")
    apply( /* Thursday  */ "2019-12-12")("Tuesday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-24")
    apply( /* Friday    */ "2019-12-13")("Tuesday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-24")
    apply( /* Saturday  */ "2019-12-14")("Tuesday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-24")
    apply( /* Sunday    */ "2019-12-15")("Tuesday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-24")
    apply( /* Monday    */ "2019-12-16")("Tuesday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-24")
    apply( /* Tuesday   */ "2019-12-17")("Tuesday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-24")
  }

  "WEDNESDAY HomeDeliveryFulfilmentDates" should "have correct newSubscriptionEarliestStartDate" in {
    apply( /* Sunday    */ "2019-12-01")("Wednesday").newSubscriptionEarliestStartDate.get should equalDate(
      "2019-12-04",
    )
    apply( /* Monday    */ "2019-12-02")("Wednesday").newSubscriptionEarliestStartDate.get should equalDate(
      "2019-12-11",
    )
    apply( /* Tuesday   */ "2019-12-03")("Wednesday").newSubscriptionEarliestStartDate.get should equalDate(
      "2019-12-11",
    )
    apply( /* Wednesday */ "2019-12-04")("Wednesday").newSubscriptionEarliestStartDate.get should equalDate(
      "2019-12-11",
    )
    apply( /* Thursday  */ "2019-12-05")("Wednesday").newSubscriptionEarliestStartDate.get should equalDate(
      "2019-12-11",
    )
    apply( /* Friday    */ "2019-12-06")("Wednesday").newSubscriptionEarliestStartDate.get should equalDate(
      "2019-12-11",
    )
    apply( /* Saturday  */ "2019-12-07")("Wednesday").newSubscriptionEarliestStartDate.get should equalDate(
      "2019-12-11",
    )
    apply( /* Sunday    */ "2019-12-08")("Wednesday").newSubscriptionEarliestStartDate.get should equalDate(
      "2019-12-11",
    )
    apply( /* Monday    */ "2019-12-09")("Wednesday").newSubscriptionEarliestStartDate.get should equalDate(
      "2019-12-18",
    )
    apply( /* Tuesday   */ "2019-12-10")("Wednesday").newSubscriptionEarliestStartDate.get should equalDate(
      "2019-12-18",
    )
    apply( /* Wednesday */ "2019-12-11")("Wednesday").newSubscriptionEarliestStartDate.get should equalDate(
      "2019-12-18",
    )
  }

  "THURSDAY HomeDeliveryFulfilmentDates" should "have correct newSubscriptionEarliestStartDate" in {
    apply( /* Monday    */ "2019-12-02")("Thursday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-05")
    apply( /* Tuesday   */ "2019-12-03")("Thursday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-12")
    apply( /* Wednesday */ "2019-12-04")("Thursday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-12")
    apply( /* Thursday  */ "2019-12-05")("Thursday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-12")
    apply( /* Friday    */ "2019-12-06")("Thursday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-12")
    apply( /* Saturday  */ "2019-12-07")("Thursday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-12")
    apply( /* Sunday    */ "2019-12-08")("Thursday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-12")
    apply( /* Monday    */ "2019-12-09")("Thursday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-12")
    apply( /* Tuesday   */ "2019-12-10")("Thursday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-19")
    apply( /* Wednesday */ "2019-12-11")("Thursday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-19")
    apply( /* Thursday  */ "2019-12-12")("Thursday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-19")
  }

  "FRIDAY HomeDeliveryFulfilmentDates" should "have correct newSubscriptionEarliestStartDate" in {
    apply( /* Tuesday   */ "2019-12-03")("Friday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-06")
    apply( /* Wednesday */ "2019-12-04")("Friday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-13")
    apply( /* Thursday  */ "2019-12-05")("Friday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-13")
    apply( /* Friday    */ "2019-12-06")("Friday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-13")
    apply( /* Saturday  */ "2019-12-07")("Friday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-13")
    apply( /* Sunday    */ "2019-12-08")("Friday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-13")
    apply( /* Monday    */ "2019-12-09")("Friday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-13")
    apply( /* Tuesday   */ "2019-12-10")("Friday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-13")
    apply( /* Wednesday */ "2019-12-11")("Friday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-20")
    apply( /* Thursday  */ "2019-12-12")("Friday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-20")
    apply( /* Friday    */ "2019-12-13")("Friday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-20")
  }

  "SATURDAY HomeDeliveryFulfilmentDates" should "have correct newSubscriptionEarliestStartDate" in {
    apply( /* Wednesday */ "2019-12-04")("Saturday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-07")
    apply( /* Thursday  */ "2019-12-05")("Saturday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-14")
    apply( /* Friday    */ "2019-12-06")("Saturday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-14")
    apply( /* Saturday  */ "2019-12-07")("Saturday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-14")
    apply( /* Sunday    */ "2019-12-08")("Saturday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-14")
    apply( /* Monday    */ "2019-12-09")("Saturday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-14")
    apply( /* Tuesday   */ "2019-12-10")("Saturday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-14")
    apply( /* Wednesday */ "2019-12-11")("Saturday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-14")
    apply( /* Thursday  */ "2019-12-12")("Saturday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-21")
    apply( /* Friday    */ "2019-12-13")("Saturday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-21")
    apply( /* Saturday  */ "2019-12-14")("Saturday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-21")
  }

  "SUNDAY HomeDeliveryFulfilmentDates" should "have correct newSubscriptionEarliestStartDate" in {
    apply( /* Wednesday */ "2019-12-04")("Sunday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-08")
    apply( /* Thursday  */ "2019-12-05")("Sunday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-15")
    apply( /* Friday    */ "2019-12-06")("Sunday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-15")
    apply( /* Saturday  */ "2019-12-07")("Sunday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-15")
    apply( /* Sunday    */ "2019-12-08")("Sunday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-15")
    apply( /* Monday    */ "2019-12-09")("Sunday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-15")
    apply( /* Tuesday   */ "2019-12-10")("Sunday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-15")
    apply( /* Wednesday */ "2019-12-11")("Sunday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-15")
    apply( /* Thursday  */ "2019-12-12")("Sunday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-22")
    apply( /* Friday    */ "2019-12-13")("Sunday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-22")
    apply( /* Saturday  */ "2019-12-14")("Sunday").newSubscriptionEarliestStartDate.get should equalDate("2019-12-22")
  }

}
