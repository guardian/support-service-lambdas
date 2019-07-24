package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holidaystopprocessor.Fixtures.config
import com.gu.holidaystopprocessor.SubscriptionUpdate.holidayCreditToAdd
import org.scalatest.{FlatSpec, Matchers}

class SubscriptionUpdateTest extends FlatSpec with Matchers {

  "holidayCreditToAdd" should "generate update correctly" in {
    val update = holidayCreditToAdd(
      config,
      subscription = Fixtures.mkSubscription(
        termEndDate = LocalDate.of(2020, 7, 12),
        price = 42.1,
        billingPeriod = "Quarter",
        chargedThroughDate = Some(LocalDate.of(2019, 9, 12))
      ),
      stoppedPublicationDate = LocalDate.of(2019, 5, 18)
    )
    update shouldBe Right(SubscriptionUpdate(
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
    val update = holidayCreditToAdd(
      config,
      subscription = Fixtures.mkSubscription(
        termEndDate = LocalDate.of(2020, 7, 12),
        price = 42.1,
        billingPeriod = "Quarter",
        chargedThroughDate = None
      ),
      stoppedPublicationDate = LocalDate.of(2019, 5, 18)
    )
    update shouldBe Left(HolidayStopFailure(
      "Original rate plan charge has no charged through date.  A bill run is needed to fix this."
    ))
  }

  it should "generate an update with an extended term when charged-through date of subscription is after its term-end date" in {
    val update = holidayCreditToAdd(
      config,
      subscription = Fixtures.mkSubscription(
        termEndDate = LocalDate.of(2020, 7, 23),
        price = 150,
        billingPeriod = "Annual",
        chargedThroughDate = Some(LocalDate.of(2020, 8, 2))
      ),
      stoppedPublicationDate = LocalDate.of(2019, 8, 6)
    )
    update shouldBe Right(SubscriptionUpdate(
      currentTerm = Some(366),
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
    val update = holidayCreditToAdd(
      config,
      subscription = Fixtures.mkSubscription(
        termEndDate = LocalDate.of(2020, 7, 23),
        price = 150,
        billingPeriod = "Annual",
        chargedThroughDate = Some(LocalDate.of(2020, 7, 23))
      ),
      stoppedPublicationDate = LocalDate.of(2019, 8, 6)
    )
    update shouldBe Right(SubscriptionUpdate(
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
