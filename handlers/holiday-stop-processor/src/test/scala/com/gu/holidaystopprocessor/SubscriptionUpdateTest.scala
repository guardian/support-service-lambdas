package com.gu.holidaystopprocessor

import com.gu.holiday_stops.Fixtures
import com.gu.zuora.subscription.{
  Add,
  AffectedPublicationDate,
  ChargeOverride,
  InvoiceDate,
  MutableCalendar,
  SubscriptionUpdate,
  Fixtures => SubscriptionFixtures,
}
import com.softwaremill.diffx.generic.auto._
import com.softwaremill.diffx.scalatest.DiffMatcher
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import java.time.temporal.TemporalAdjusters
import java.time.{DayOfWeek, LocalDate}

class SubscriptionUpdateTest extends AnyFlatSpec with Matchers with DiffMatcher with EitherValues {
  MutableCalendar.setFakeToday(Some(LocalDate.parse("2019-08-12")))
  val effectiveStartDate = LocalDate.of(2019, 6, 12)
  val dateCreditIsApplied = effectiveStartDate.plusMonths(3)
  val stoppedPublicationDate = AffectedPublicationDate(
    dateCreditIsApplied.`with`(TemporalAdjusters.previous(DayOfWeek.FRIDAY)),
  )
  private val creditProduct = HolidayCreditProduct.Code.GuardianWeekly

  "forHolidayStop" should "generate update correctly" in {
    val subscription = SubscriptionFixtures.mkGuardianWeeklySubscription(
      termStartDate = LocalDate.of(2019, 7, 12),
      termEndDate = LocalDate.of(2020, 7, 12),
      price = 42.1,
      billingPeriod = "Quarter",
      effectiveStartDate = effectiveStartDate,
    )

    val update = SubscriptionUpdate(
      creditProduct,
      subscription = subscription,
      account = Fixtures.mkAccount(),
      stoppedPublicationDate,
      None,
    )
    update shouldBe Right(
      SubscriptionUpdate(
        currentTerm = None,
        currentTermPeriodType = None,
        List(
          Add(
            productRatePlanId = creditProduct.productRatePlanId,
            contractEffectiveDate = dateCreditIsApplied,
            customerAcceptanceDate = dateCreditIsApplied,
            serviceActivationDate = dateCreditIsApplied,
            chargeOverrides = List(
              ChargeOverride(
                productRatePlanChargeId = creditProduct.productRatePlanChargeId,
                HolidayStart__c = stoppedPublicationDate.value,
                HolidayEnd__c = stoppedPublicationDate.value,
                price = -3.24,
              ),
            ),
          ),
        ),
      ),
    )
  }

  it should "generate an update with an extended term when credit invoice date is after its term-end date" in {
    val subscription = SubscriptionFixtures.mkGuardianWeeklySubscription(
      termStartDate = dateCreditIsApplied.minusYears(1).minusDays(1),
      termEndDate = dateCreditIsApplied.minusDays(1),
      price = 42.1,
      billingPeriod = "Quarter",
      effectiveStartDate = effectiveStartDate,
    )
    val update = SubscriptionUpdate(
      creditProduct,
      subscription = subscription,
      account = Fixtures.mkAccount(),
      stoppedPublicationDate,
      None,
    )
    update shouldBe Right(
      SubscriptionUpdate(
        currentTerm = Some(366),
        currentTermPeriodType = Some("Day"),
        List(
          Add(
            creditProduct.productRatePlanId,
            contractEffectiveDate = dateCreditIsApplied,
            customerAcceptanceDate = dateCreditIsApplied,
            serviceActivationDate = dateCreditIsApplied,
            chargeOverrides = List(
              ChargeOverride(
                creditProduct.productRatePlanChargeId,
                HolidayStart__c = stoppedPublicationDate.value,
                HolidayEnd__c = stoppedPublicationDate.value,
                price = -3.24,
              ),
            ),
          ),
        ),
      ),
    )
  }

  it should "generate an update without an extended term when credit invoice date is on its term-end date" in {
    val subscription = SubscriptionFixtures.mkGuardianWeeklySubscription(
      termStartDate = dateCreditIsApplied.minusYears(1),
      termEndDate = dateCreditIsApplied,
      price = 42.1,
      billingPeriod = "Quarter",
      chargedThroughDate = None,
      effectiveStartDate = effectiveStartDate,
    )
    val update = SubscriptionUpdate(
      creditProduct,
      subscription = subscription,
      account = Fixtures.mkAccount(),
      stoppedPublicationDate,
      None,
    )
    update shouldBe Right(
      SubscriptionUpdate(
        currentTerm = None,
        currentTermPeriodType = None,
        List(
          Add(
            creditProduct.productRatePlanId,
            contractEffectiveDate = dateCreditIsApplied,
            customerAcceptanceDate = dateCreditIsApplied,
            serviceActivationDate = dateCreditIsApplied,
            chargeOverrides = List(
              ChargeOverride(
                creditProduct.productRatePlanChargeId,
                HolidayStart__c = stoppedPublicationDate.value,
                HolidayEnd__c = stoppedPublicationDate.value,
                price = -3.24,
              ),
            ),
          ),
        ),
      ),
    )
  }

  it should "generate an update using given invoice date if provided" in {
    val subscription = SubscriptionFixtures.mkGuardianWeeklySubscription(
      termStartDate = dateCreditIsApplied.minusYears(1),
      termEndDate = dateCreditIsApplied,
      price = 42.1,
      billingPeriod = "Quarter",
      chargedThroughDate = None,
      effectiveStartDate = effectiveStartDate,
    )
    val givenInvoiceDate = InvoiceDate(LocalDate.of(2020, 3, 1))
    val update = SubscriptionUpdate(
      creditProduct,
      subscription = subscription,
      account = Fixtures.mkAccount(),
      stoppedPublicationDate,
      Some(givenInvoiceDate),
    )
    update.value should matchTo(
      SubscriptionUpdate(
        currentTerm = Some(536),
        currentTermPeriodType = Some("Day"),
        List(
          Add(
            creditProduct.productRatePlanId,
            contractEffectiveDate = givenInvoiceDate.value,
            customerAcceptanceDate = givenInvoiceDate.value,
            serviceActivationDate = givenInvoiceDate.value,
            chargeOverrides = List(
              ChargeOverride(
                creditProduct.productRatePlanChargeId,
                HolidayStart__c = stoppedPublicationDate.value,
                HolidayEnd__c = stoppedPublicationDate.value,
                price = -3.24,
              ),
            ),
          ),
        ),
      ),
    )
  }
}
