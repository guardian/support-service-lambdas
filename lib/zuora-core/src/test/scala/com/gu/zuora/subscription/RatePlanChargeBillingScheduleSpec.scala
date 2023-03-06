package com.gu.zuora.subscription

import java.time.LocalDate
import java.time.temporal.ChronoUnit

import org.scalactic.TypeCheckedTripleEquals
import org.scalatest.Inside.inside
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class RatePlanChargeBillingScheduleSpec
    extends AnyFlatSpec
    with Matchers
    with EitherValues
    with TypeCheckedTripleEquals {
  "BillingSchedule" should "calculate fixed monthly period valid date range" in {
    testFixedBillingPeriod(
      billingPeriodName = "Month",
      optionalSpecificBillingPeriod = None,
      billingPeriodsRatePlanIsValidFor = 2,
      effectiveStartDate = LocalDate.of(2019, 10, 1),
      expectedEndDate = LocalDate.of(2019, 11, 30),
    )
  }
  it should "calculate fixed annual period valid date range" in {
    testFixedBillingPeriod(
      billingPeriodName = "Annual",
      optionalSpecificBillingPeriod = None,
      billingPeriodsRatePlanIsValidFor = 2,
      effectiveStartDate = LocalDate.of(2019, 10, 1),
      expectedEndDate = LocalDate.of(2021, 9, 30),
    )
  }
  it should "calculate fixed semi annual period valid date range" in {
    testFixedBillingPeriod(
      billingPeriodName = "Semi_Annual",
      optionalSpecificBillingPeriod = None,
      billingPeriodsRatePlanIsValidFor = 2,
      effectiveStartDate = LocalDate.of(2019, 10, 1),
      expectedEndDate = LocalDate.of(2020, 9, 30),
    )
  }
  it should "calculate fixed quarterly period valid date range" in {
    testFixedBillingPeriod(
      billingPeriodName = "Quarter",
      optionalSpecificBillingPeriod = None,
      billingPeriodsRatePlanIsValidFor = 2,
      effectiveStartDate = LocalDate.of(2019, 10, 1),
      expectedEndDate = LocalDate.of(2020, 3, 31),
    )
  }
  it should "calculate fixed specific number of weeks period valid date range" in {
    testFixedBillingPeriod(
      billingPeriodName = "Specific_Weeks",
      optionalSpecificBillingPeriod = Some(3),
      billingPeriodsRatePlanIsValidFor = 2,
      effectiveStartDate = LocalDate.of(2019, 10, 1),
      expectedEndDate = LocalDate.of(2019, 11, 11),
    )
  }
  it should "calculate open ended valid date range" in {
    val effectiveStartDate = LocalDate.of(2019, 10, 1)
    inside(
      RatePlanChargeBillingSchedule(
        Fixtures.mkGuardianWeeklySubscription(),
        Fixtures.mkRatePlanCharge(
          name = "GW Oct 18 - Quarterly - Domestic",
          price = 1,
          billingPeriod = "Month",
          effectiveStartDate = effectiveStartDate,
          endDateCondition = Some("Subscription_End"),
          upToPeriodsType = None,
          upToPeriods = None,
          billingDay = Some("ChargeTriggerDay"),
          triggerEvent = Some("SpecificDate"),
          triggerDate = Some(effectiveStartDate),
          chargedThroughDate = None,
          processedThroughDate = None,
        ),
        Fixtures.mkAccount(),
      ),
    ) { case Right(billingSchedule) =>
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
      BillDates(LocalDate.of(2019, 11, 1), LocalDate.of(2019, 11, 30)),
    )
  }
  it should "calculate annual billing periods" in {
    testFixedBillingSchedule(
      "Annual",
      None,
      LocalDate.of(2019, 10, 1),
      BillDates(LocalDate.of(2019, 10, 1), LocalDate.of(2020, 9, 30)),
      BillDates(LocalDate.of(2020, 10, 1), LocalDate.of(2021, 9, 30)),
    )
  }
  it should "calculate Semi_Annual billing periods" in {
    testFixedBillingSchedule(
      "Semi_Annual",
      None,
      LocalDate.of(2019, 10, 1),
      BillDates(LocalDate.of(2019, 10, 1), LocalDate.of(2020, 3, 31)),
      BillDates(LocalDate.of(2020, 4, 1), LocalDate.of(2020, 9, 30)),
    )
  }
  it should "calculate Quarter billing periods" in {
    testFixedBillingSchedule(
      "Quarter",
      None,
      LocalDate.of(2019, 10, 1),
      BillDates(LocalDate.of(2019, 10, 1), LocalDate.of(2019, 12, 31)),
      BillDates(LocalDate.of(2020, 1, 1), LocalDate.of(2020, 3, 31)),
    )
  }
  it should "calculate specific weeks billing periods" in {
    testFixedBillingSchedule(
      "Specific_Weeks",
      Some(3),
      LocalDate.of(2019, 10, 1),
      BillDates(LocalDate.of(2019, 10, 1), LocalDate.of(2019, 10, 21)),
      BillDates(LocalDate.of(2019, 10, 22), LocalDate.of(2019, 11, 11)),
    )
  }
  it should "calculate quarterly billing period when period starts at end of month" in {
    testFixedBillingSchedule(
      "Quarter",
      None,
      LocalDate.of(2019, 8, 31),
      BillDates(LocalDate.of(2019, 8, 31), LocalDate.of(2019, 11, 29)),
      BillDates(LocalDate.of(2019, 11, 30), LocalDate.of(2020, 2, 28)),
    )
  }
  it should "calculate start date from customer acceptance date" in {
    val expectedDate = LocalDate.of(2020, 1, 1)
    testBillingScheduleStartDate(
      "CustomerAcceptance",
      expectedDate,
      customerAcceptanceDate = expectedDate,
    )
  }
  it should "calculate start date from contract effective date" in {
    val expectedDate = LocalDate.of(2020, 1, 1)
    testBillingScheduleStartDate(
      "ContractEffective",
      expectedDate,
      contractEffectiveDate = expectedDate,
    )
  }
  it should "calculate start date from specific trigger date" in {
    val expectedDate = LocalDate.of(2020, 1, 1)
    testBillingScheduleStartDate(
      "SpecificDate",
      expectedDate,
      triggerDate = Some(expectedDate),
    )
  }
  it should "use effective start date if matches charged through date" in {
    val calculatedDate = LocalDate.of(2020, 1, 1)
    val effectiveStartDate = LocalDate.of(2020, 1, 5)
    testBillingScheduleStartDate(
      "SpecificDate",
      effectiveStartDate,
      triggerDate = Some(calculatedDate),
      effectiveStartDate = effectiveStartDate,
      processedThroughDate = Some(effectiveStartDate),
    )
  }
  it should "adjust billing day to bill cycle day" in {
    val billCycleDay = 30
    val startDate = LocalDate.of(2020, 2, 28)
    val expectedSecondBillDate = startDate.plusMonths(1).withDayOfMonth(billCycleDay)

    testBillingScheduleStartDate(
      "SpecificDate",
      expectedSecondBillDate,
      triggerDate = Some(startDate),
      billCycleDay = billCycleDay,
      billingDay = Some("DefaultFromCustomer"),
    )
  }

  private def testFixedBillingPeriod(
      billingPeriodName: String,
      optionalSpecificBillingPeriod: Option[Int],
      billingPeriodsRatePlanIsValidFor: Int,
      effectiveStartDate: LocalDate,
      expectedEndDate: LocalDate,
  ) = {
    inside(
      RatePlanChargeBillingSchedule(
        Fixtures.mkGuardianWeeklySubscription(),
        Fixtures.mkRatePlanCharge(
          name = "GW Oct 18 - Quarterly - Domestic",
          price = 1,
          billingPeriod = billingPeriodName,
          effectiveStartDate = effectiveStartDate,
          endDateCondition = Some("Fixed_Period"),
          upToPeriodsType = Some("Billing_Periods"),
          upToPeriods = Some(billingPeriodsRatePlanIsValidFor),
          specificBillingPeriod = optionalSpecificBillingPeriod,
          billingDay = Some("ChargeTriggerDay"),
          triggerEvent = Some("SpecificDate"),
          triggerDate = Some(effectiveStartDate),
          chargedThroughDate = None,
          processedThroughDate = None,
        ),
        Fixtures.mkAccount(),
      ),
    ) { case Right(billingSchedule) =>
      val dateBeforeSchedule = effectiveStartDate.minusDays(1)
      billingSchedule.isDateCoveredBySchedule(dateBeforeSchedule) should equal(false)
      billingSchedule.billDatesCoveringDate(dateBeforeSchedule) should equal(
        Left(ZuoraApiFailure(s"Billing schedule does not cover date $dateBeforeSchedule")),
      )
      billingSchedule.isDateCoveredBySchedule(effectiveStartDate) should equal(true)
      billingSchedule.isDateCoveredBySchedule(expectedEndDate) should equal(true)
      val dateAfterSchedule = expectedEndDate.plusDays(1)
      billingSchedule.isDateCoveredBySchedule(dateAfterSchedule) should equal(false)
      billingSchedule.billDatesCoveringDate(dateAfterSchedule) should equal(
        Left(ZuoraApiFailure(s"Billing schedule does not cover date $dateAfterSchedule")),
      )
    }
  }

  private def testFixedBillingSchedule(
      billingPeriodName: String,
      optionalSpecificBillingPeriod: Option[Int],
      effectiveStartDate: LocalDate,
      expectedBillDates1: BillDates,
      expectedBillDates2: BillDates,
  ) = {
    inside(
      RatePlanChargeBillingSchedule(
        Fixtures.mkGuardianWeeklySubscription(),
        Fixtures.mkRatePlanCharge(
          name = "GW Oct 18 - Quarterly - Domestic",
          price = 1,
          billingPeriod = billingPeriodName,
          endDateCondition = Some("Fixed_Period"),
          upToPeriodsType = Some("Billing_Periods"),
          upToPeriods = Some(2),
          specificBillingPeriod = optionalSpecificBillingPeriod,
          billingDay = Some("ChargeTriggerDay"),
          triggerEvent = Some("SpecificDate"),
          triggerDate = Some(effectiveStartDate),
          chargedThroughDate = None,
          processedThroughDate = None,
        ),
        Fixtures.mkAccount(),
      ),
    ) { case Right(billingSchedule) =>
      datesBetweenDates(expectedBillDates1.startDate, expectedBillDates1.endDate).foreach(date =>
        withClue(s"For date: $date") {
          billingSchedule.billDatesCoveringDate(date) should equal(Right(expectedBillDates1))
        },
      )
      datesBetweenDates(expectedBillDates2.startDate, expectedBillDates2.endDate).foreach(date =>
        withClue(s"For date: $date") {
          billingSchedule.billDatesCoveringDate(date) should equal(Right(expectedBillDates2))
        },
      )
    }
  }

  private def testBillingScheduleStartDate(
      triggerEvent: String,
      expectedDate: LocalDate,
      customerAcceptanceDate: LocalDate = LocalDate.of(2020, 6, 6),
      contractEffectiveDate: LocalDate = LocalDate.of(2020, 6, 6),
      triggerDate: Option[LocalDate] = None,
      effectiveStartDate: LocalDate = LocalDate.of(2020, 6, 6),
      processedThroughDate: Option[LocalDate] = None,
      billCycleDay: Int = 1,
      billingDay: Option[String] = Some("ChargeTriggerDay"),
  ) = {
    inside(
      RatePlanChargeBillingSchedule(
        Fixtures.mkGuardianWeeklySubscription(
          customerAcceptanceDate = customerAcceptanceDate,
          contractEffectiveDate = contractEffectiveDate,
        ),
        Fixtures.mkRatePlanCharge(
          name = "GW Oct 18 - Quarterly - Domestic",
          price = 1,
          billingPeriod = "Month",
          endDateCondition = Some("Fixed_Period"),
          upToPeriodsType = Some("Billing_Periods"),
          upToPeriods = Some(2),
          specificBillingPeriod = None,
          billingDay = billingDay,
          triggerEvent = Some(triggerEvent),
          triggerDate = triggerDate,
          processedThroughDate = processedThroughDate,
          effectiveStartDate = effectiveStartDate,
        ),
        Fixtures.mkAccount(
          billCycleDay = billCycleDay,
        ),
      ),
    ) { case Right(billingSchedule) =>
      inside(billingSchedule.billDatesCoveringDate(expectedDate)) { case Right(billDates: BillDates) =>
        billDates.startDate should equal(expectedDate)
      }
    }
  }

  def datesBetweenDates(date1: LocalDate, date2: LocalDate) = {
    (0L to ChronoUnit.DAYS.between(date1, date2))
      .map(date1.plusDays(_))
      .toList
  }
}
