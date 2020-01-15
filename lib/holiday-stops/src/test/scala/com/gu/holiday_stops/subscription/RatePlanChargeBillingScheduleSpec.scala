package com.gu.holiday_stops.subscription

import java.time.temporal.ChronoUnit
import java.time.LocalDate

import com.gu.holiday_stops.{Fixtures, ZuoraApiFailure}
import org.scalactic.TypeCheckedTripleEquals
import org.scalatest.Inside.inside
import org.scalatest.{EitherValues, FlatSpec, Matchers}

class RatePlanChargeBillingScheduleSpec extends FlatSpec with Matchers with EitherValues with TypeCheckedTripleEquals {
  "BillingSchedule" should "calculate fixed monthly period valid date range" in {
    testFixedBillingPeriod(
      billingPeriodName = "Month",
      optionalSpecificBillingPeriod = None,
      billingPeriodsRatePlanIsValidFor = 2,
      effectiveStartDate = LocalDate.of(2019, 10, 1),
      expectedEndDate = LocalDate.of(2019, 11, 30)
    )
  }
  it should "calculate fixed annual period valid date range" in {
    testFixedBillingPeriod(
      billingPeriodName = "Annual",
      optionalSpecificBillingPeriod = None,
      billingPeriodsRatePlanIsValidFor = 2,
      effectiveStartDate = LocalDate.of(2019, 10, 1),
      expectedEndDate = LocalDate.of(2021, 9, 30)
    )
  }
  it should "calculate fixed semi annual period valid date range" in {
    testFixedBillingPeriod(
      billingPeriodName = "Semi_Annual",
      optionalSpecificBillingPeriod = None,
      billingPeriodsRatePlanIsValidFor = 2,
      effectiveStartDate = LocalDate.of(2019, 10, 1),
      expectedEndDate = LocalDate.of(2020, 9, 30)
    )
  }
  it should "calculate fixed quarterly period valid date range" in {
    testFixedBillingPeriod(
      billingPeriodName = "Quarter",
      optionalSpecificBillingPeriod = None,
      billingPeriodsRatePlanIsValidFor = 2,
      effectiveStartDate = LocalDate.of(2019, 10, 1),
      expectedEndDate = LocalDate.of(2020, 3, 31)
    )
  }
  it should "calculate fixed specific number of weeks period valid date range" in {
    testFixedBillingPeriod(
      billingPeriodName = "Specific_Weeks",
      optionalSpecificBillingPeriod = Some(3),
      billingPeriodsRatePlanIsValidFor = 2,
      effectiveStartDate = LocalDate.of(2019, 10, 1),
      expectedEndDate = LocalDate.of(2019, 11, 11)
    )
  }
  it should "calculate open ended valid date range" in {
    val effectiveStartDate = LocalDate.of(2019, 10, 1)
    inside(
      RatePlanChargeBillingSchedule(
        Fixtures.mkRatePlanCharge(
          name = "GW Oct 18 - Quarterly - Domestic",
          price = 1,
          billingPeriod = "Month",
          effectiveStartDate = effectiveStartDate,
          endDateCondition = Some("Subscription_End"),
          upToPeriodsType = None,
          upToPeriods = None
        )
      )
    ) {
        case Right(billingSchedule) =>
          billingSchedule.isDateCoveredBySchedule(effectiveStartDate.minusDays(1)) should equal(false)
          billingSchedule.isDateCoveredBySchedule(effectiveStartDate) should equal(true)
          billingSchedule.isDateCoveredBySchedule(LocalDate.MAX) should equal(true)
      }
  }
  it should "calculate monthly billing periods" in {
    testFixedBillingSchedule(
      "Month",
      None,
      LocalDate.of(2019, 10, 1),
      BillDates(LocalDate.of(2019, 10, 1), LocalDate.of(2019, 10, 31)),
      BillDates(LocalDate.of(2019, 11, 1), LocalDate.of(2019, 11, 30))
    )
  }
  it should "calculate annual billing periods" in {
    testFixedBillingSchedule(
      "Annual",
      None,
      LocalDate.of(2019, 10, 1),
      BillDates(LocalDate.of(2019, 10, 1), LocalDate.of(2020, 9, 30)),
      BillDates(LocalDate.of(2020, 10, 1), LocalDate.of(2021, 9, 30))
    )
  }
  it should "calculate Semi_Annual billing periods" in {
    testFixedBillingSchedule(
      "Semi_Annual",
      None,
      LocalDate.of(2019, 10, 1),
      BillDates(LocalDate.of(2019, 10, 1), LocalDate.of(2020, 3, 31)),
      BillDates(LocalDate.of(2020, 4, 1), LocalDate.of(2020, 9, 30))
    )
  }
  it should "calculate Quarter billing periods" in {
    testFixedBillingSchedule(
      "Quarter",
      None,
      LocalDate.of(2019, 10, 1),
      BillDates(LocalDate.of(2019, 10, 1), LocalDate.of(2019, 12, 31)),
      BillDates(LocalDate.of(2020, 1, 1), LocalDate.of(2020, 3, 31))
    )
  }
  it should "calculate specific weeks billing periods" in {
    testFixedBillingSchedule(
      "Specific_Weeks",
      Some(3),
      LocalDate.of(2019, 10, 1),
      BillDates(LocalDate.of(2019, 10, 1), LocalDate.of(2019, 10, 21)),
      BillDates(LocalDate.of(2019, 10, 22), LocalDate.of(2019, 11, 11))
    )
  }

  private def testFixedBillingPeriod(billingPeriodName: String, optionalSpecificBillingPeriod: Option[Int], billingPeriodsRatePlanIsValidFor: Int, effectiveStartDate: LocalDate, expectedEndDate: LocalDate) = {
    inside(
      RatePlanChargeBillingSchedule(
        Fixtures.mkRatePlanCharge(
          "GW Oct 18 - Quarterly - Domestic",
          price = 1,
          billingPeriod = billingPeriodName,
          effectiveStartDate = effectiveStartDate,
          endDateCondition = Some("Fixed_Period"),
          upToPeriodsType = Some("Billing_Periods"),
          upToPeriods = Some(billingPeriodsRatePlanIsValidFor),
          specificBillingPeriod = optionalSpecificBillingPeriod
        )
      )
    ) {
        case Right(billingSchedule) =>
          val dateBeforeSchedule = effectiveStartDate.minusDays(1)
          billingSchedule.isDateCoveredBySchedule(dateBeforeSchedule) should equal(false)
          billingSchedule.billDatesCoveringDate(dateBeforeSchedule) should equal(
            Left(ZuoraApiFailure(s"Billing schedule does not cover date $dateBeforeSchedule"))
          )
          billingSchedule.isDateCoveredBySchedule(effectiveStartDate) should equal(true)
          billingSchedule.isDateCoveredBySchedule(expectedEndDate) should equal(true)
          val dateAfterSchedule = expectedEndDate.plusDays(1)
          billingSchedule.isDateCoveredBySchedule(dateAfterSchedule) should equal(false)
          billingSchedule.billDatesCoveringDate(dateAfterSchedule) should equal(
            Left(ZuoraApiFailure(s"Billing schedule does not cover date $dateAfterSchedule"))
          )
      }
  }

  private def testFixedBillingSchedule(
    billingPeriodName: String,
    optionalSpecificBillingPeriod: Option[Int],
    effectiveStartDate: LocalDate,
    expectedBillDates1: BillDates,
    expectedBillDates2: BillDates
  ) = {
    inside(
      RatePlanChargeBillingSchedule(
        Fixtures.mkRatePlanCharge(
          name = "GW Oct 18 - Quarterly - Domestic",
          price = 1,
          billingPeriod = billingPeriodName,
          effectiveStartDate = effectiveStartDate,
          endDateCondition = Some("Fixed_Period"),
          upToPeriodsType = Some("Billing_Periods"),
          upToPeriods = Some(2),
          specificBillingPeriod = optionalSpecificBillingPeriod
        )
      )
    ) {
        case Right(billingSchedule) =>
          datesBetweenDates(expectedBillDates1.startDate, expectedBillDates1.endDate).foreach(date =>
            billingSchedule.billDatesCoveringDate(date) should equal(Right(expectedBillDates1)))
          datesBetweenDates(expectedBillDates2.startDate, expectedBillDates2.endDate).foreach(date =>
            billingSchedule.billDatesCoveringDate(date) should equal(Right(expectedBillDates2)))
      }
  }

  def datesBetweenDates(date1: LocalDate, date2: LocalDate) = {
    (0L to ChronoUnit.DAYS.between(date1, date2))
      .map(date1.plusDays(_))
      .toList
  }
}
