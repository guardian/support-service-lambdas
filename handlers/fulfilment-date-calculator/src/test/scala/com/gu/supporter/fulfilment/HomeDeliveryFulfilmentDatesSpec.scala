package com.gu.supporter.fulfilment

import java.time.LocalDate

import org.scalatest.{FlatSpec, Matchers}

class HomeDeliveryFulfilmentDatesSpec extends FlatSpec with Matchers with DateSupport {

  def apply(today: LocalDate) = HomeDeliveryFulfilmentDates.apply(today)(
    BankHolidays(Nil) // TODO reuse sampleBankHolidays from LocalDateHelpersSpec with some test cases below
  )

  "HomeDeliveryFulfilmentDates" should "should contain correct holidayStopProcessorTargetDate(s)" in {
    apply( /* Wednesday */ "2019-12-04").values.flatMap(_.holidayStopProcessorTargetDate) shouldBe List[LocalDate]("2019-12-06")
    apply( /* Thursday  */ "2019-12-05").values.flatMap(_.holidayStopProcessorTargetDate) shouldBe List[LocalDate]("2019-12-09", "2019-12-07", "2019-12-08")
    apply( /* Friday    */ "2019-12-06").values.flatMap(_.holidayStopProcessorTargetDate) shouldBe Nil
    apply( /* Saturday  */ "2019-12-07").values.flatMap(_.holidayStopProcessorTargetDate) shouldBe Nil
    apply( /* Sunday    */ "2019-12-08").values.flatMap(_.holidayStopProcessorTargetDate) shouldBe List[LocalDate]("2019-12-10")
    apply( /* Monday    */ "2019-12-09").values.flatMap(_.holidayStopProcessorTargetDate) shouldBe List[LocalDate]("2019-12-11")
    apply( /* Tuesday   */ "2019-12-10").values.flatMap(_.holidayStopProcessorTargetDate) shouldBe List[LocalDate]("2019-12-12")
    apply( /* Wednesday */ "2019-12-11").values.flatMap(_.holidayStopProcessorTargetDate) shouldBe List[LocalDate]("2019-12-13")
    apply( /* Thursday  */ "2019-12-12").values.flatMap(_.holidayStopProcessorTargetDate) shouldBe List[LocalDate]("2019-12-16", "2019-12-14", "2019-12-15")
    apply( /* Friday    */ "2019-12-13").values.flatMap(_.holidayStopProcessorTargetDate) shouldBe Nil
    apply( /* Saturday  */ "2019-12-14").values.flatMap(_.holidayStopProcessorTargetDate) shouldBe Nil
    apply( /* Sunday    */ "2019-12-15").values.flatMap(_.holidayStopProcessorTargetDate) shouldBe List[LocalDate]("2019-12-17")

    // TODO add some bank holiday examples
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
    apply( /* Saturday  */ "2019-12-07")("Tuesday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-10")
    apply( /* Sunday    */ "2019-12-08")("Tuesday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-10")
    apply( /* Monday    */ "2019-12-09")("Tuesday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-17")
    apply( /* Tuesday   */ "2019-12-10")("Tuesday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-17")
    apply( /* Wednesday */ "2019-12-11")("Tuesday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-17")
    apply( /* Thursday  */ "2019-12-12")("Tuesday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-17")
    apply( /* Friday    */ "2019-12-13")("Tuesday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-17")
    apply( /* Saturday  */ "2019-12-14")("Tuesday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-17")
    apply( /* Sunday    */ "2019-12-15")("Tuesday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-17")
    apply( /* Monday    */ "2019-12-16")("Tuesday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-24")
    apply( /* Tuesday   */ "2019-12-17")("Tuesday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-24")
  }

  "WEDNESDAY HomeDeliveryFulfilmentDates" should "have correct deliveryAddressChangeEffectiveDate" in {
    apply( /* Sunday    */ "2019-12-01")("Wednesday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-04")
    apply( /* Monday    */ "2019-12-02")("Wednesday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-04")
    apply( /* Tuesday   */ "2019-12-03")("Wednesday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-11")
    apply( /* Wednesday */ "2019-12-04")("Wednesday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-11")
    apply( /* Thursday  */ "2019-12-05")("Wednesday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-11")
    apply( /* Friday    */ "2019-12-06")("Wednesday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-11")
    apply( /* Saturday  */ "2019-12-07")("Wednesday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-11")
    apply( /* Sunday    */ "2019-12-08")("Wednesday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-11")
    apply( /* Monday    */ "2019-12-09")("Wednesday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-11")
    apply( /* Tuesday   */ "2019-12-10")("Wednesday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-18")
    apply( /* Wednesday */ "2019-12-11")("Wednesday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-18")
  }

  "THURSDAY HomeDeliveryFulfilmentDates" should "have correct deliveryAddressChangeEffectiveDate" in {
    apply( /* Monday    */ "2019-12-02")("Thursday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-05")
    apply( /* Tuesday   */ "2019-12-03")("Thursday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-05")
    apply( /* Wednesday */ "2019-12-04")("Thursday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-12")
    apply( /* Thursday  */ "2019-12-05")("Thursday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-12")
    apply( /* Friday    */ "2019-12-06")("Thursday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-12")
    apply( /* Saturday  */ "2019-12-07")("Thursday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-12")
    apply( /* Sunday    */ "2019-12-08")("Thursday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-12")
    apply( /* Monday    */ "2019-12-09")("Thursday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-12")
    apply( /* Tuesday   */ "2019-12-10")("Thursday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-12")
    apply( /* Wednesday */ "2019-12-11")("Thursday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-19")
    apply( /* Thursday  */ "2019-12-12")("Thursday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-19")
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
    apply( /* Wednesday */ "2019-12-04")("Saturday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-07")
    apply( /* Thursday  */ "2019-12-05")("Saturday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-07")
    apply( /* Friday    */ "2019-12-06")("Saturday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-14")
    apply( /* Saturday  */ "2019-12-07")("Saturday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-14")
    apply( /* Sunday    */ "2019-12-08")("Saturday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-14")
    apply( /* Monday    */ "2019-12-09")("Saturday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-14")
    apply( /* Tuesday   */ "2019-12-10")("Saturday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-14")
    apply( /* Wednesday */ "2019-12-11")("Saturday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-14")
    apply( /* Thursday  */ "2019-12-12")("Saturday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-14")
    apply( /* Friday    */ "2019-12-13")("Saturday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-21")
    apply( /* Saturday  */ "2019-12-14")("Saturday").deliveryAddressChangeEffectiveDate.get should equalDate("2019-12-21")
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

}
