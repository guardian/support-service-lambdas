package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holiday_stops.{Add, ChargeOverride, CurrentGuardianWeeklySubscription, ExtendedTerm, HolidayCredit, HolidayCreditUpdate, ZuoraHolidayWriteError}
import com.gu.holidaystopprocessor.Fixtures.config
import org.scalatest.{EitherValues, FlatSpec, Matchers}

class SubscriptionUpdateTest extends FlatSpec with Matchers with EitherValues {

  val guardianWeeklyProductRatePlanIds = Fixtures.config.guardianWeeklyProductRatePlanIds

  "holidayCreditToAdd" should "generate update correctly" in {
    val subscription = Fixtures.mkSubscription(
      termStartDate = LocalDate.of(2019, 7, 12),
      termEndDate = LocalDate.of(2020, 7, 12),
      price = 42.1,
      billingPeriod = "Quarter",
      chargedThroughDate = Some(LocalDate.of(2019, 9, 12))
    )
    val currentGuardianWeeklySubscription = CurrentGuardianWeeklySubscription(subscription, guardianWeeklyProductRatePlanIds)
    val nextInvoiceStartDate = NextBillingPeriodStartDate(currentGuardianWeeklySubscription.right.value)
    val maybeExtendedTerm = ExtendedTerm(nextInvoiceStartDate, subscription)
    val holidayCredit = HolidayCredit(currentGuardianWeeklySubscription.right.value)

    val update = HolidayCreditUpdate(
      config.holidayCreditProduct,
      subscription = subscription,
      stoppedPublicationDate = LocalDate.of(2019, 5, 18),
      nextInvoiceStartDate = nextInvoiceStartDate,
      maybeExtendedTerm = maybeExtendedTerm,
      holidayCredit
    )
    update shouldBe Right(HolidayCreditUpdate(
      currentTerm = None,
      currentTermPeriodType = None,
      List(
        Add(
          productRatePlanId = "ratePlanId",
          contractEffectiveDate = LocalDate.of(2019, 9, 12),
          customerAcceptanceDate = LocalDate.of(2019, 9, 12),
          serviceActivationDate = LocalDate.of(2019, 9, 12),
          chargeOverrides = List(
            ChargeOverride(
              productRatePlanChargeId = "ratePlanChargeId",
              HolidayStart__c = LocalDate.of(2019, 5, 18),
              HolidayEnd__c = LocalDate.of(2019, 5, 18),
              price = -3.24
            )
          )
        )
      )
    ))
  }

  it should "fail to generate an update when there's no chargedThroughDate, i.e., no invoice has been generated" in {
    val subscription = Fixtures.mkSubscription(
      termStartDate = LocalDate.of(2019, 7, 12),
      termEndDate = LocalDate.of(2020, 7, 12),
      price = 42.1,
      billingPeriod = "Quarter",
      chargedThroughDate = None
    )
    CurrentGuardianWeeklySubscription(subscription, guardianWeeklyProductRatePlanIds).left.value shouldBe a[ZuoraHolidayWriteError]
  }

  it should "generate an update with an extended term when charged-through date of subscription is after its term-end date" in {
    val subscription = Fixtures.mkSubscription(
      termStartDate = LocalDate.of(2019, 7, 23),
      termEndDate = LocalDate.of(2020, 7, 23),
      price = 150,
      billingPeriod = "Annual",
      chargedThroughDate = Some(LocalDate.of(2020, 8, 2))
    )
    val currentGuardianWeeklySubscription = CurrentGuardianWeeklySubscription(subscription, guardianWeeklyProductRatePlanIds)
    val nextInvoiceStartDate = NextBillingPeriodStartDate(currentGuardianWeeklySubscription.right.value)
    val maybeExtendedTerm = ExtendedTerm(nextInvoiceStartDate, subscription)
    val holidayCredit = HolidayCredit(currentGuardianWeeklySubscription.right.value)
    val update = HolidayCreditUpdate(
      config.holidayCreditProduct,
      subscription = subscription,
      stoppedPublicationDate = LocalDate.of(2019, 8, 6),
      nextInvoiceStartDate = nextInvoiceStartDate,
      maybeExtendedTerm = maybeExtendedTerm,
      holidayCredit
    )
    update shouldBe Right(HolidayCreditUpdate(
      currentTerm = Some(376),
      currentTermPeriodType = Some("Day"),
      List(Add(
        productRatePlanId = "ratePlanId",
        contractEffectiveDate = LocalDate.of(2020, 8, 2),
        customerAcceptanceDate = LocalDate.of(2020, 8, 2),
        serviceActivationDate = LocalDate.of(2020, 8, 2),
        chargeOverrides = List(
          ChargeOverride(
            productRatePlanChargeId = "ratePlanChargeId",
            HolidayStart__c = LocalDate.of(2019, 8, 6),
            HolidayEnd__c = LocalDate.of(2019, 8, 6),
            price = -2.89
          )
        )
      ))
    ))
  }

  it should "generate an update without an extended term when charged-through date of subscription is on its term-end date" in {
    val subscription = Fixtures.mkSubscription(
      termStartDate = LocalDate.of(2019, 7, 23),
      termEndDate = LocalDate.of(2020, 7, 23),
      price = 150,
      billingPeriod = "Annual",
      chargedThroughDate = Some(LocalDate.of(2020, 7, 23))
    )
    val currentGuardianWeeklySubscription = CurrentGuardianWeeklySubscription(subscription, guardianWeeklyProductRatePlanIds)
    val nextInvoiceStartDate = NextBillingPeriodStartDate(currentGuardianWeeklySubscription.right.value)
    val maybeExtendedTerm = ExtendedTerm(nextInvoiceStartDate, subscription)
    val holidayCredit = HolidayCredit(currentGuardianWeeklySubscription.right.value)
    val update = HolidayCreditUpdate(
      config.holidayCreditProduct,
      subscription = subscription,
      stoppedPublicationDate = LocalDate.of(2019, 8, 6),
      nextInvoiceStartDate = nextInvoiceStartDate,
      maybeExtendedTerm = maybeExtendedTerm,
      holidayCredit
    )
    update shouldBe Right(HolidayCreditUpdate(
      currentTerm = None,
      currentTermPeriodType = None,
      List(Add(
        productRatePlanId = "ratePlanId",
        contractEffectiveDate = LocalDate.of(2020, 7, 23),
        customerAcceptanceDate = LocalDate.of(2020, 7, 23),
        serviceActivationDate = LocalDate.of(2020, 7, 23),
        chargeOverrides = List(
          ChargeOverride(
            productRatePlanChargeId = "ratePlanChargeId",
            HolidayStart__c = LocalDate.of(2019, 8, 6),
            HolidayEnd__c = LocalDate.of(2019, 8, 6),
            price = -2.89
          )
        )
      ))
    ))
  }
}
