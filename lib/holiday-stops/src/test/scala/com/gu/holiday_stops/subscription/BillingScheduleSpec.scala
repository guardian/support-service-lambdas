package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.ZuoraHolidayError
import org.scalactic.TypeCheckedTripleEquals
import org.scalatest.Inside.inside
import org.scalatest.{EitherValues, FlatSpec, Matchers}

class BillingScheduleSpec extends FlatSpec with Matchers with EitherValues with TypeCheckedTripleEquals {
  "BillingSchedule" should "calculate fixed period valid date range" in {
    testFixedBillingPeriod(
      zuoraBillingPeriodId = "Month",
      optionalSpecificBillingPeriod = None,
      billingPeriodsRatePlanIsValidFor = 2,
      effectiveStartDate = LocalDate.of(2019, 10, 1),
      expectedEndDate = LocalDate.of(2019, 11, 30)
    )
    testFixedBillingPeriod(
      zuoraBillingPeriodId = "Annual",
      optionalSpecificBillingPeriod = None,
      billingPeriodsRatePlanIsValidFor = 2,
      effectiveStartDate = LocalDate.of(2019, 10, 1),
      expectedEndDate = LocalDate.of(2021, 9, 30)
    )
    testFixedBillingPeriod(
      zuoraBillingPeriodId = "Semi_Annual",
      optionalSpecificBillingPeriod = None,
      billingPeriodsRatePlanIsValidFor = 2,
      effectiveStartDate = LocalDate.of(2019, 10, 1),
      expectedEndDate = LocalDate.of(2020, 9, 30)
    )
    testFixedBillingPeriod(
      zuoraBillingPeriodId = "Quarter",
      optionalSpecificBillingPeriod = None,
      billingPeriodsRatePlanIsValidFor = 2,
      effectiveStartDate = LocalDate.of(2019, 10, 1),
      expectedEndDate = LocalDate.of(2020, 3, 31)
    )
    testFixedBillingPeriod(
      zuoraBillingPeriodId = "Specific_Weeks",
      optionalSpecificBillingPeriod = Some(3),
      billingPeriodsRatePlanIsValidFor = 2,
      effectiveStartDate = LocalDate.of(2019, 10, 1),
      expectedEndDate = LocalDate.of(2019, 11, 11)
    )
  }
  it should "calculate open ended valid date range" in {
    val effectiveStartDate = LocalDate.of(2019, 10, 1)
    inside(
      BillingSchedule(
        optionalBillingPeriodId = Some("Month"),
        optionalSpecificBillingPeriod = None,
        effectiveStartDate = effectiveStartDate,
        optionalEndDateCondition = Some("Subscription_End"),
        upToPeriodsType = None,
        upToPeriods = None
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
      BillingPeriod(LocalDate.of(2019, 10, 1), LocalDate.of(2019, 10, 31)),
      BillingPeriod(LocalDate.of(2019, 11, 1), LocalDate.of(2019, 11, 30))
    )
  }
  it should "calculate annual billing periods" in {
    testFixedBillingSchedule(
      "Annual",
      None,
      LocalDate.of(2019, 10, 1),
      BillingPeriod(LocalDate.of(2019, 10, 1), LocalDate.of(2020, 9, 30)),
      BillingPeriod(LocalDate.of(2020, 10, 1), LocalDate.of(2021, 9, 30))
    )
  }
  it should "calculate Semi_Annual billing periods" in {
    testFixedBillingSchedule(
      "Semi_Annual",
      None,
      LocalDate.of(2019, 10, 1),
      BillingPeriod(LocalDate.of(2019, 10, 1), LocalDate.of(2020, 3, 31)),
      BillingPeriod(LocalDate.of(2020, 4, 1), LocalDate.of(2020, 9, 30))
    )
  }
  it should "calculate Quarter billing periods" in {
    testFixedBillingSchedule(
      "Quarter",
      None,
      LocalDate.of(2019, 10, 1),
      BillingPeriod(LocalDate.of(2019, 10, 1), LocalDate.of(2019, 12, 31)),
      BillingPeriod(LocalDate.of(2020, 1, 1), LocalDate.of(2020, 3, 31))
    )
  }
  it should "calculate specific weeks billing periods" in {
    testFixedBillingSchedule(
      "Specific_Weeks",
      Some(3),
      LocalDate.of(2019, 10, 1),
      BillingPeriod(LocalDate.of(2019, 10, 1), LocalDate.of(2019, 10, 21)),
      BillingPeriod(LocalDate.of(2019, 10, 22), LocalDate.of(2019, 11, 11))
    )
  }

  private def testFixedBillingPeriod(zuoraBillingPeriodId: String, optionalSpecificBillingPeriod: Option[Int], billingPeriodsRatePlanIsValidFor: Int, effectiveStartDate: LocalDate, expectedEndDate: LocalDate) = {
    inside(
      BillingSchedule(
        Some(zuoraBillingPeriodId),
        optionalSpecificBillingPeriod,
        effectiveStartDate,
        Some("Fixed_Period"),
        Some("Billing_Periods"),
        Some(billingPeriodsRatePlanIsValidFor)
      )
    ) {
        case Right(billingSchedule) =>
          val dateBeforeSchedule = effectiveStartDate.minusDays(1)
          billingSchedule.isDateCoveredBySchedule(dateBeforeSchedule) should equal(false)
          billingSchedule.billingPeriodForDate(dateBeforeSchedule) should equal(
            Left(ZuoraHolidayError(s"Billing schedule does not cover date $dateBeforeSchedule"))
          )
          billingSchedule.isDateCoveredBySchedule(effectiveStartDate) should equal(true)
          billingSchedule.isDateCoveredBySchedule(expectedEndDate) should equal(true)
          val dateAfterSchedule = expectedEndDate.plusDays(1)
          billingSchedule.isDateCoveredBySchedule(dateAfterSchedule) should equal(false)
          billingSchedule.billingPeriodForDate(dateAfterSchedule) should equal(
            Left(ZuoraHolidayError(s"Billing schedule does not cover date $dateAfterSchedule"))
          )
      }
  }

  private def testFixedBillingSchedule(
    zuoraBillingPeriodId: String,
    optionalSpecificBillingPeriod: Option[Int],
    effectiveStartDate: LocalDate,
    expectedBillingPeriod1: BillingPeriod,
    expectedBillingPeriod2: BillingPeriod
  ) = {
    inside(
      BillingSchedule(
        Some(zuoraBillingPeriodId),
        optionalSpecificBillingPeriod,
        effectiveStartDate,
        Some("Fixed_Period"),
        Some("Billing_Periods"),
        Some(2)
      )
    ) {
        case Right(billingSchedule) =>
          billingSchedule.billingPeriodForDate(expectedBillingPeriod1.startDate) should equal(Right(expectedBillingPeriod1))
          billingSchedule.billingPeriodForDate(expectedBillingPeriod2.startDate) should equal(Right(expectedBillingPeriod2))
      }
  }
}
