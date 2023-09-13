package com.gu.supporter.fulfilment

import java.time.LocalDate

import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GuardianWeeklyFulfilmentDatesSpec extends AnyFlatSpec with Matchers with DateSupport {

  it should "calculate holidayStopProcessorTargetDate" in {
    GuardianWeeklyFulfilmentDates( /* Monday    */ "2019-12-02").values.flatMap(
      _.holidayStopProcessorTargetDate,
    ) shouldBe Nil
    GuardianWeeklyFulfilmentDates( /* Tuesday   */ "2019-12-03").values.flatMap(
      _.holidayStopProcessorTargetDate,
    ) shouldBe Nil
    GuardianWeeklyFulfilmentDates( /* Wednesday */ "2019-12-04").values.flatMap(
      _.holidayStopProcessorTargetDate,
    ) shouldBe List[LocalDate]("2019-12-13")
    GuardianWeeklyFulfilmentDates( /* Thursday  */ "2019-12-05").values.flatMap(
      _.holidayStopProcessorTargetDate,
    ) shouldBe Nil
    GuardianWeeklyFulfilmentDates( /* Friday    */ "2019-12-06").values.flatMap(
      _.holidayStopProcessorTargetDate,
    ) shouldBe Nil
    GuardianWeeklyFulfilmentDates( /* Saturday  */ "2019-12-07").values.flatMap(
      _.holidayStopProcessorTargetDate,
    ) shouldBe Nil
    GuardianWeeklyFulfilmentDates( /* Sunday    */ "2019-12-08").values.flatMap(
      _.holidayStopProcessorTargetDate,
    ) shouldBe Nil
    GuardianWeeklyFulfilmentDates( /* Monday    */ "2019-12-09").values.flatMap(
      _.holidayStopProcessorTargetDate,
    ) shouldBe Nil
    GuardianWeeklyFulfilmentDates( /* Tuesday   */ "2019-12-10").values.flatMap(
      _.holidayStopProcessorTargetDate,
    ) shouldBe Nil
    GuardianWeeklyFulfilmentDates( /* Wednesday */ "2019-12-11").values.flatMap(
      _.holidayStopProcessorTargetDate,
    ) shouldBe List[LocalDate]("2019-12-20")
    GuardianWeeklyFulfilmentDates( /* Thursday  */ "2019-12-12").values.flatMap(
      _.holidayStopProcessorTargetDate,
    ) shouldBe Nil
    GuardianWeeklyFulfilmentDates( /* Friday    */ "2019-12-13").values.flatMap(
      _.holidayStopProcessorTargetDate,
    ) shouldBe Nil
  }

  it should "calculate deliveryAddressChangeEffectiveDate" in {
    GuardianWeeklyFulfilmentDates("2019-12-02")("Friday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-13",
    )
    GuardianWeeklyFulfilmentDates("2019-12-03")("Friday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-13",
    )
    GuardianWeeklyFulfilmentDates("2019-12-04")("Friday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-13",
    )
    GuardianWeeklyFulfilmentDates("2019-12-05")("Friday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-20",
    )
    GuardianWeeklyFulfilmentDates("2019-12-06")("Friday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-20",
    )
    GuardianWeeklyFulfilmentDates("2019-12-07")("Friday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-20",
    )
    GuardianWeeklyFulfilmentDates("2019-12-08")("Friday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-20",
    )
    GuardianWeeklyFulfilmentDates("2019-12-09")("Friday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-20",
    )
    GuardianWeeklyFulfilmentDates("2019-12-10")("Friday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-20",
    )
    GuardianWeeklyFulfilmentDates("2019-12-11")("Friday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-20",
    )
    GuardianWeeklyFulfilmentDates("2019-12-12")("Friday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-27",
    )
    GuardianWeeklyFulfilmentDates("2019-12-13")("Friday").deliveryAddressChangeEffectiveDate.get should equalDate(
      "2019-12-27",
    )
  }

  it should "calculate holidayStopFirstAvailableDate" in {
    GuardianWeeklyFulfilmentDates("2019-12-02")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-07")
    GuardianWeeklyFulfilmentDates("2019-12-03")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-07")
    GuardianWeeklyFulfilmentDates("2019-12-04")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-14")
    GuardianWeeklyFulfilmentDates("2019-12-05")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-14")
    GuardianWeeklyFulfilmentDates("2019-12-06")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-14")
    GuardianWeeklyFulfilmentDates("2019-12-07")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-14")
    GuardianWeeklyFulfilmentDates("2019-12-08")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-14")
    GuardianWeeklyFulfilmentDates("2019-12-09")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-14")
    GuardianWeeklyFulfilmentDates("2019-12-10")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-14")
    GuardianWeeklyFulfilmentDates("2019-12-11")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-21")
    GuardianWeeklyFulfilmentDates("2019-12-12")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-21")
    GuardianWeeklyFulfilmentDates("2019-12-13")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-21")
  }

  it should "calculate finalFulfilmentFileGenerationDate" in {
    GuardianWeeklyFulfilmentDates("2019-12-02")("Friday").finalFulfilmentFileGenerationDate.get should equalDate(
      "2019-12-05",
    )
    GuardianWeeklyFulfilmentDates("2019-12-03")("Friday").finalFulfilmentFileGenerationDate.get should equalDate(
      "2019-12-05",
    )
    GuardianWeeklyFulfilmentDates("2019-12-04")("Friday").finalFulfilmentFileGenerationDate.get should equalDate(
      "2019-12-05",
    )
    GuardianWeeklyFulfilmentDates("2019-12-05")("Friday").finalFulfilmentFileGenerationDate.get should equalDate(
      "2019-12-12",
    )
    GuardianWeeklyFulfilmentDates("2019-12-06")("Friday").finalFulfilmentFileGenerationDate.get should equalDate(
      "2019-12-12",
    )
    GuardianWeeklyFulfilmentDates("2019-12-07")("Friday").finalFulfilmentFileGenerationDate.get should equalDate(
      "2019-12-12",
    )
    GuardianWeeklyFulfilmentDates("2019-12-08")("Friday").finalFulfilmentFileGenerationDate.get should equalDate(
      "2019-12-12",
    )
    GuardianWeeklyFulfilmentDates("2019-12-09")("Friday").finalFulfilmentFileGenerationDate.get should equalDate(
      "2019-12-12",
    )
    GuardianWeeklyFulfilmentDates("2019-12-10")("Friday").finalFulfilmentFileGenerationDate.get should equalDate(
      "2019-12-12",
    )
    GuardianWeeklyFulfilmentDates("2019-12-11")("Friday").finalFulfilmentFileGenerationDate.get should equalDate(
      "2019-12-12",
    )
    GuardianWeeklyFulfilmentDates("2019-12-12")("Friday").finalFulfilmentFileGenerationDate.get should equalDate(
      "2019-12-19",
    )
    GuardianWeeklyFulfilmentDates("2019-12-13")("Friday").finalFulfilmentFileGenerationDate.get should equalDate(
      "2019-12-19",
    )
  }

  it should "calculate newSubscriptionEarliestStartDate" in {
    GuardianWeeklyFulfilmentDates("2019-12-02")("Friday").newSubscriptionEarliestStartDate should equalDate(
      "2019-12-13",
    )
    GuardianWeeklyFulfilmentDates("2019-12-03")("Friday").newSubscriptionEarliestStartDate should equalDate(
      "2019-12-13",
    )
    GuardianWeeklyFulfilmentDates("2019-12-04")("Friday").newSubscriptionEarliestStartDate should equalDate(
      "2019-12-13",
    )
    GuardianWeeklyFulfilmentDates("2019-12-05")("Friday").newSubscriptionEarliestStartDate should equalDate(
      "2019-12-20",
    )
    GuardianWeeklyFulfilmentDates("2019-12-06")("Friday").newSubscriptionEarliestStartDate should equalDate(
      "2019-12-20",
    )
    GuardianWeeklyFulfilmentDates("2019-12-07")("Friday").newSubscriptionEarliestStartDate should equalDate(
      "2019-12-20",
    )
    GuardianWeeklyFulfilmentDates("2019-12-08")("Friday").newSubscriptionEarliestStartDate should equalDate(
      "2019-12-20",
    )
    GuardianWeeklyFulfilmentDates("2019-12-09")("Friday").newSubscriptionEarliestStartDate should equalDate(
      "2019-12-20",
    )
    GuardianWeeklyFulfilmentDates("2019-12-10")("Friday").newSubscriptionEarliestStartDate should equalDate(
      "2019-12-20",
    )
    GuardianWeeklyFulfilmentDates("2019-12-11")("Friday").newSubscriptionEarliestStartDate should equalDate(
      "2019-12-20",
    )
    GuardianWeeklyFulfilmentDates("2019-12-12")("Friday").newSubscriptionEarliestStartDate should equalDate(
      "2019-12-27",
    )
    GuardianWeeklyFulfilmentDates("2019-12-13")("Friday").newSubscriptionEarliestStartDate should equalDate(
      "2019-12-27",
    )
  }

}
