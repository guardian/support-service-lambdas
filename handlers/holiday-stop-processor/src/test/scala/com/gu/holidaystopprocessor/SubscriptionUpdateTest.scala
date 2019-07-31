package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holidaystopprocessor.Fixtures.config
import org.scalatest.{FlatSpec, Matchers}

class SubscriptionUpdateTest extends FlatSpec with Matchers {

  "holidayCreditToAdd" should "generate update correctly" in {
    val subscription = Fixtures.mkSubscription(
      termStartDate = LocalDate.of(2019, 7, 12),
      termEndDate = LocalDate.of(2020, 7, 12),
      price = 42.1,
      billingPeriod = "Quarter",
      chargedThroughDate = Some(LocalDate.of(2019, 9, 12))
    )
    val nextInvoiceStartDate = NextBillingPeriodStartDate(subscription)
    val maybeExtendedTerm = ExtendedTerm(nextInvoiceStartDate.right.get, subscription)
    val holidayCredit = HolidayCredit(subscription)

    val update = HolidayCreditUpdate(
      config,
      subscription = subscription,
      stoppedPublicationDate = LocalDate.of(2019, 5, 18),
      nextInvoiceStartDate = nextInvoiceStartDate.right.get,
      maybeExtendedTerm = maybeExtendedTerm,
      holidayCredit
    )
    update shouldBe Right(HolidayCreditUpdate(
      currentTerm = None,
      currentTermPeriodType = None,
      Seq(
        Add(
          productRatePlanId = "ratePlanId",
          contractEffectiveDate = LocalDate.of(2019, 9, 12),
          customerAcceptanceDate = LocalDate.of(2019, 9, 12),
          serviceActivationDate = LocalDate.of(2019, 9, 12),
          chargeOverrides = Seq(
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

  it should "fail to generate an update when there's no charged-through date" in {
    val subscription = Fixtures.mkSubscription(
      termStartDate = LocalDate.of(2019, 7, 12),
      termEndDate = LocalDate.of(2020, 7, 12),
      price = 42.1,
      billingPeriod = "Quarter",
      chargedThroughDate = None
    )
    val nextInvoiceStartDate = NextBillingPeriodStartDate(subscription)
    nextInvoiceStartDate shouldBe Left(HolidayStopFailure(
      "Original rate plan charge has no charged through date. A bill run is needed to fix this."
    ))
  }

  it should "generate an update with an extended term when charged-through date of subscription is after its term-end date" in {
    val subscription = Fixtures.mkSubscription(
      termStartDate = LocalDate.of(2019, 7, 23),
      termEndDate = LocalDate.of(2020, 7, 23),
      price = 150,
      billingPeriod = "Annual",
      chargedThroughDate = Some(LocalDate.of(2020, 8, 2))
    )
    val nextInvoiceStartDate = NextBillingPeriodStartDate(subscription)
    val maybeExtendedTerm = ExtendedTerm(nextInvoiceStartDate.right.get, subscription)
    val holidayCredit = HolidayCredit(subscription)
    val update = HolidayCreditUpdate(
      config,
      subscription = subscription,
      stoppedPublicationDate = LocalDate.of(2019, 8, 6),
      nextInvoiceStartDate = nextInvoiceStartDate.right.get,
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
    val nextInvoiceStartDate = NextBillingPeriodStartDate(subscription)
    val maybeExtendedTerm = ExtendedTerm(nextInvoiceStartDate.right.get, subscription)
    val holidayCredit = HolidayCredit(subscription)
    val update = HolidayCreditUpdate(
      config,
      subscription = subscription,
      stoppedPublicationDate = LocalDate.of(2019, 8, 6),
      nextInvoiceStartDate = nextInvoiceStartDate.right.get,
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
