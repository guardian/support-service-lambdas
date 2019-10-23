package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holiday_stops._
import com.gu.holiday_stops.subscription._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import org.scalatest.{EitherValues, FlatSpec, Matchers}

class HolidayCreditUpdateTest extends FlatSpec with Matchers with EitherValues {
  MutableCalendar.setFakeToday(Some(LocalDate.parse("2019-08-12")))
  val effectiveStartDate = LocalDate.of(2019, 6, 12)
  val dateCreditIsApplied = effectiveStartDate.plusMonths(3)
  val stoppedPublicationDate = StoppedPublicationDate(dateCreditIsApplied.minusDays(1))

  "holidayCreditToAdd" should "generate update correctly" in {
    val subscription = Fixtures.mkGuardianWeeklySubscription(
      termStartDate = LocalDate.of(2019, 7, 12),
      termEndDate = LocalDate.of(2020, 7, 12),
      price = 42.1,
      billingPeriod = "Quarter",
      effectiveStartDate = effectiveStartDate
    )
    val currentGuardianWeeklySubscription = GuardianWeeklySubscription(subscription, stoppedPublicationDate).right.value
    val holidayCredit = currentGuardianWeeklySubscription.credit
    val maybeExtendedTerm = ExtendedTerm(holidayCredit.invoiceDate, subscription)

    val update = HolidayCreditUpdate(
      Fixtures.config.holidayCreditProduct,
      subscription = subscription,
      stoppedPublicationDate = stoppedPublicationDate.value,
      maybeExtendedTerm = maybeExtendedTerm,
      holidayCredit
    )
    update shouldBe Right(HolidayCreditUpdate(
      currentTerm = None,
      currentTermPeriodType = None,
      List(
        Add(
          productRatePlanId = Fixtures.config.holidayCreditProduct.productRatePlanId,
          contractEffectiveDate = dateCreditIsApplied,
          customerAcceptanceDate = dateCreditIsApplied,
          serviceActivationDate = dateCreditIsApplied,
          chargeOverrides = List(
            ChargeOverride(
              productRatePlanChargeId = Fixtures.config.holidayCreditProduct.productRatePlanChargeId,
              HolidayStart__c = stoppedPublicationDate.value,
              HolidayEnd__c = stoppedPublicationDate.value,
              price = -3.24
            )
          )
        )
      )
    ))
  }

  it should "generate an update with an extended term when credit invoice date is after its term-end date" in {
    val subscription = Fixtures.mkGuardianWeeklySubscription(
      termStartDate = dateCreditIsApplied.minusYears(1).minusDays(1),
      termEndDate = dateCreditIsApplied.minusDays(1),
      price = 42.1,
      billingPeriod = "Quarter",
      effectiveStartDate = effectiveStartDate
    )
    val currentGuardianWeeklySubscription = GuardianWeeklySubscription(subscription, stoppedPublicationDate).right.value
    val holidayCredit = currentGuardianWeeklySubscription.credit
    val maybeExtendedTerm = ExtendedTerm(holidayCredit.invoiceDate, subscription)
    val update = HolidayCreditUpdate(
      Fixtures.config.holidayCreditProduct,
      subscription = subscription,
      stoppedPublicationDate = stoppedPublicationDate.value,
      maybeExtendedTerm = maybeExtendedTerm,
      holidayCredit
    )
    update shouldBe Right(HolidayCreditUpdate(
      currentTerm = Some(366),
      currentTermPeriodType = Some("Day"),
      List(Add(
        Fixtures.config.holidayCreditProduct.productRatePlanId,
        contractEffectiveDate = dateCreditIsApplied,
        customerAcceptanceDate = dateCreditIsApplied,
        serviceActivationDate = dateCreditIsApplied,
        chargeOverrides = List(
          ChargeOverride(
            Fixtures.config.holidayCreditProduct.productRatePlanChargeId,
            HolidayStart__c = stoppedPublicationDate.value,
            HolidayEnd__c = stoppedPublicationDate.value,
            price = -3.24
          )
        )
      ))
    ))
  }

  it should "generate an update without an extended term when credit invoice date is on its term-end date" in {
    val subscription = Fixtures.mkGuardianWeeklySubscription(
      termStartDate = dateCreditIsApplied.minusYears(1),
      termEndDate = dateCreditIsApplied,
      price = 42.1,
      billingPeriod = "Quarter",
      chargedThroughDate = Some(LocalDate.of(2020, 8, 2)),
      effectiveStartDate = effectiveStartDate
    )
    val currentGuardianWeeklySubscription = GuardianWeeklySubscription(subscription, stoppedPublicationDate).right.value
    val holidayCredit = currentGuardianWeeklySubscription.credit
    val maybeExtendedTerm = ExtendedTerm(holidayCredit.invoiceDate, subscription)
    val update = HolidayCreditUpdate(
      Fixtures.config.holidayCreditProduct,
      subscription = subscription,
      stoppedPublicationDate = stoppedPublicationDate.value,
      maybeExtendedTerm = maybeExtendedTerm,
      holidayCredit
    )
    update shouldBe Right(HolidayCreditUpdate(
      currentTerm = None,
      currentTermPeriodType = None,
      List(Add(
        Fixtures.config.holidayCreditProduct.productRatePlanId,
        contractEffectiveDate = dateCreditIsApplied,
        customerAcceptanceDate = dateCreditIsApplied,
        serviceActivationDate = dateCreditIsApplied,
        chargeOverrides = List(
          ChargeOverride(
            Fixtures.config.holidayCreditProduct.productRatePlanChargeId,
            HolidayStart__c = stoppedPublicationDate.value,
            HolidayEnd__c = stoppedPublicationDate.value,
            price = -3.24
          )
        )
      ))
    ))
  }
}
