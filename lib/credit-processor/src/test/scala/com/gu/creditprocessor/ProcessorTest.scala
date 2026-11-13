package com.gu.creditprocessor

import com.gu.zuora.subscription.{CreditChargeOverride, CreditProductAddition, SubscriptionUpdate}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import java.time.LocalDate

class ProcessorTest extends AnyFlatSpec with Matchers {
  private val subscriptionNumber = "A-S000001"
  private val creditDate = LocalDate.parse("2026-10-01")

  "creditIdempotencyKey" should "generate a stable key from the subscription, rate plan and credit date" in {
    val update = creditUpdate("holiday-credit-rate-plan", creditDate)

    Processor.creditIdempotencyKey(subscriptionNumber, update) shouldBe
      "credit-processor-20dd2a1f-be7f-3670-ba3f-90c93e950426"
  }

  it should "distinguish credits for different dates" in {
    val firstDate = creditUpdate("holiday-credit-rate-plan", creditDate)
    val secondDate = creditUpdate("holiday-credit-rate-plan", creditDate.plusDays(1))

    Processor.creditIdempotencyKey(subscriptionNumber, firstDate) should not be
      Processor.creditIdempotencyKey(subscriptionNumber, secondDate)
  }

  it should "distinguish credits for different subscriptions" in {
    val update = creditUpdate("holiday-credit-rate-plan", creditDate)

    Processor.creditIdempotencyKey("A-S000001", update) should not be
      Processor.creditIdempotencyKey("A-S000002", update)
  }

  it should "distinguish credits with different rate plans for the same date" in {
    val holidayStop = creditUpdate("holiday-credit-rate-plan", creditDate)
    val deliveryProblem = creditUpdate("delivery-credit-rate-plan", creditDate)

    Processor.creditIdempotencyKey(subscriptionNumber, holidayStop) should not be
      Processor.creditIdempotencyKey(subscriptionNumber, deliveryProblem)
  }

  private def creditUpdate(productRatePlanId: String, date: LocalDate): SubscriptionUpdate =
    SubscriptionUpdate(
      extendedTermEndDate = None,
      productAddition = CreditProductAddition(
        productRatePlanId = productRatePlanId,
        contractEffectiveDate = date,
        customerAcceptanceDate = date,
        serviceActivationDate = date,
        chargeOverride = CreditChargeOverride(
          productRatePlanChargeId = "credit-charge",
          HolidayStart__c = date,
          HolidayEnd__c = date,
          price = -1.25,
        ),
      ),
    )
}
