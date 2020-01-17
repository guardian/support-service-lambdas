package com.gu.holidaystopprocessor

import java.time.temporal.TemporalAdjusters
import java.time.{DayOfWeek, LocalDate}

import com.gu.zuora.subscription.{Add, AffectedPublicationDate, ChargeOverride, ExtendedTerm, HolidayStopCredit, MutableCalendar, SubscriptionData, SubscriptionUpdate, Fixtures => SubscriptionFixtures}
import org.scalatest.{EitherValues, FlatSpec, Matchers}
import com.gu.holiday_stops.Fixtures

class SubscriptionUpdateTest extends FlatSpec with Matchers with EitherValues {
  MutableCalendar.setFakeToday(Some(LocalDate.parse("2019-08-12")))
  val effectiveStartDate = LocalDate.of(2019, 6, 12)
  val dateCreditIsApplied = effectiveStartDate.plusMonths(3)
  val stoppedPublicationDate = AffectedPublicationDate(
    dateCreditIsApplied.`with`(TemporalAdjusters.previous(DayOfWeek.FRIDAY))
  )

  "forHolidayStop" should "generate update correctly" in {
    val subscription = SubscriptionFixtures.mkGuardianWeeklySubscription(
      termStartDate = LocalDate.of(2019, 7, 12),
      termEndDate = LocalDate.of(2020, 7, 12),
      price = 42.1,
      billingPeriod = "Quarter",
      effectiveStartDate = effectiveStartDate
    )
    val subscriptionData = SubscriptionData(subscription).right.value
    val issueData = subscriptionData.issueDataForDate(stoppedPublicationDate.value).right.value
    val holidayCredit = HolidayStopCredit(issueData.credit, issueData.nextBillingPeriodStartDate)
    val maybeExtendedTerm = ExtendedTerm(holidayCredit.invoiceDate, subscription)

    val update = SubscriptionUpdate.forHolidayStop(
      Fixtures.config.creditProduct,
      subscription = subscription,
      stoppedPublicationDate = stoppedPublicationDate.value,
      maybeExtendedTerm = maybeExtendedTerm,
      holidayCredit
    )
    update shouldBe Right(SubscriptionUpdate(
      currentTerm = None,
      currentTermPeriodType = None,
      List(
        Add(
          productRatePlanId = Fixtures.config.creditProduct.productRatePlanId,
          contractEffectiveDate = dateCreditIsApplied,
          customerAcceptanceDate = dateCreditIsApplied,
          serviceActivationDate = dateCreditIsApplied,
          chargeOverrides = List(
            ChargeOverride(
              productRatePlanChargeId = Fixtures.config.creditProduct.productRatePlanChargeId,
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
    val subscription = SubscriptionFixtures.mkGuardianWeeklySubscription(
      termStartDate = dateCreditIsApplied.minusYears(1).minusDays(1),
      termEndDate = dateCreditIsApplied.minusDays(1),
      price = 42.1,
      billingPeriod = "Quarter",
      effectiveStartDate = effectiveStartDate
    )
    val subscriptionData = SubscriptionData(subscription).right.value
    val issueData = subscriptionData.issueDataForDate(stoppedPublicationDate.value).right.value
    val holidayCredit = HolidayStopCredit(issueData.credit, issueData.nextBillingPeriodStartDate)
    val maybeExtendedTerm = ExtendedTerm(holidayCredit.invoiceDate, subscription)
    val update = SubscriptionUpdate.forHolidayStop(
      Fixtures.config.creditProduct,
      subscription = subscription,
      stoppedPublicationDate = stoppedPublicationDate.value,
      maybeExtendedTerm = maybeExtendedTerm,
      holidayCredit
    )
    update shouldBe Right(SubscriptionUpdate(
      currentTerm = Some(366),
      currentTermPeriodType = Some("Day"),
      List(Add(
        Fixtures.config.creditProduct.productRatePlanId,
        contractEffectiveDate = dateCreditIsApplied,
        customerAcceptanceDate = dateCreditIsApplied,
        serviceActivationDate = dateCreditIsApplied,
        chargeOverrides = List(
          ChargeOverride(
            Fixtures.config.creditProduct.productRatePlanChargeId,
            HolidayStart__c = stoppedPublicationDate.value,
            HolidayEnd__c = stoppedPublicationDate.value,
            price = -3.24
          )
        )
      ))
    ))
  }

  it should "generate an update without an extended term when credit invoice date is on its term-end date" in {
    val subscription = SubscriptionFixtures.mkGuardianWeeklySubscription(
      termStartDate = dateCreditIsApplied.minusYears(1),
      termEndDate = dateCreditIsApplied,
      price = 42.1,
      billingPeriod = "Quarter",
      chargedThroughDate = Some(LocalDate.of(2020, 8, 2)),
      effectiveStartDate = effectiveStartDate
    )
    val subscriptionData = SubscriptionData(subscription).right.value
    val issueData = subscriptionData.issueDataForDate(stoppedPublicationDate.value).right.value
    val holidayCredit = HolidayStopCredit(issueData.credit, issueData.nextBillingPeriodStartDate)
    val maybeExtendedTerm = ExtendedTerm(holidayCredit.invoiceDate, subscription)
    val update = SubscriptionUpdate.forHolidayStop(
      Fixtures.config.creditProduct,
      subscription = subscription,
      stoppedPublicationDate = stoppedPublicationDate.value,
      maybeExtendedTerm = maybeExtendedTerm,
      holidayCredit
    )
    update shouldBe Right(SubscriptionUpdate(
      currentTerm = None,
      currentTermPeriodType = None,
      List(Add(
        Fixtures.config.creditProduct.productRatePlanId,
        contractEffectiveDate = dateCreditIsApplied,
        customerAcceptanceDate = dateCreditIsApplied,
        serviceActivationDate = dateCreditIsApplied,
        chargeOverrides = List(
          ChargeOverride(
            Fixtures.config.creditProduct.productRatePlanChargeId,
            HolidayStart__c = stoppedPublicationDate.value,
            HolidayEnd__c = stoppedPublicationDate.value,
            price = -3.24
          )
        )
      ))
    ))
  }
}
