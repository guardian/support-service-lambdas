package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holiday_stops
import com.gu.holiday_stops._
import com.gu.holiday_stops.subscription._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import org.scalatest.{EitherValues, FlatSpec, Matchers}

class HolidayCreditUpdateTest extends FlatSpec with Matchers with EitherValues {

  val chargedThroughDate = LocalDate.parse("2019-09-12")
  val stoppedPublicationDate = StoppedPublicationDate(chargedThroughDate.minusDays(1))

  "holidayCreditToAdd" should "generate update correctly" in {
    val subscription = Fixtures.mkSubscription(
      termStartDate = LocalDate.of(2019, 7, 12),
      termEndDate = LocalDate.of(2020, 7, 12),
      price = 42.1,
      billingPeriod = "Quarter",
      chargedThroughDate = Some(chargedThroughDate)
    )
    val currentGuardianWeeklySubscription = GuardianWeeklySubscription(subscription, stoppedPublicationDate).right.value
    val nextInvoiceStartDate = currentGuardianWeeklySubscription.nextBillingPeriodStartDate
    val maybeExtendedTerm = ExtendedTerm(nextInvoiceStartDate, subscription)
    val holidayCredit = currentGuardianWeeklySubscription.credit

    val update = HolidayCreditUpdate(
      Fixtures.config.holidayCreditProduct,
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
          productRatePlanId = Fixtures.config.holidayCreditProduct.productRatePlanId,
          contractEffectiveDate = chargedThroughDate,
          customerAcceptanceDate = chargedThroughDate,
          serviceActivationDate = chargedThroughDate,
          chargeOverrides = List(
            ChargeOverride(
              productRatePlanChargeId = Fixtures.config.holidayCreditProduct.productRatePlanChargeId,
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
    GuardianWeeklySubscription(subscription, stoppedPublicationDate).left.value shouldBe a[ZuoraHolidayError]
  }

  it should "generate an update with an extended term when charged-through date of subscription is after its term-end date" in {
    val subscription = Fixtures.mkSubscription(
      termStartDate = LocalDate.of(2019, 7, 23),
      termEndDate = LocalDate.of(2020, 7, 23),
      price = 150,
      billingPeriod = "Annual",
      chargedThroughDate = Some(LocalDate.of(2020, 8, 2))
    )
    val currentGuardianWeeklySubscription = GuardianWeeklySubscription(subscription, stoppedPublicationDate).right.value
    val nextInvoiceStartDate = currentGuardianWeeklySubscription.nextBillingPeriodStartDate
    val maybeExtendedTerm = ExtendedTerm(nextInvoiceStartDate, subscription)
    val holidayCredit = currentGuardianWeeklySubscription.credit
    val update = HolidayCreditUpdate(
      Fixtures.config.holidayCreditProduct,
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
        Fixtures.config.holidayCreditProduct.productRatePlanId,
        contractEffectiveDate = LocalDate.of(2020, 8, 2),
        customerAcceptanceDate = LocalDate.of(2020, 8, 2),
        serviceActivationDate = LocalDate.of(2020, 8, 2),
        chargeOverrides = List(
          ChargeOverride(
            Fixtures.config.holidayCreditProduct.productRatePlanChargeId,
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
    val currentGuardianWeeklySubscription = GuardianWeeklySubscription(subscription, stoppedPublicationDate).right.value
    val nextInvoiceStartDate = currentGuardianWeeklySubscription.nextBillingPeriodStartDate
    val maybeExtendedTerm = ExtendedTerm(nextInvoiceStartDate, subscription)
    val holidayCredit = currentGuardianWeeklySubscription.credit
    val update = HolidayCreditUpdate(
      Fixtures.config.holidayCreditProduct,
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
        Fixtures.config.holidayCreditProduct.productRatePlanId,
        contractEffectiveDate = LocalDate.of(2020, 7, 23),
        customerAcceptanceDate = LocalDate.of(2020, 7, 23),
        serviceActivationDate = LocalDate.of(2020, 7, 23),
        chargeOverrides = List(
          ChargeOverride(
            Fixtures.config.holidayCreditProduct.productRatePlanChargeId,
            HolidayStart__c = LocalDate.of(2019, 8, 6),
            HolidayEnd__c = LocalDate.of(2019, 8, 6),
            price = -2.89
          )
        )
      ))
    ))
  }
}
