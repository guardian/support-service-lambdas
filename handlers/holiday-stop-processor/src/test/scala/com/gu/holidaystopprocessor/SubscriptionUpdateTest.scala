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
    update shouldBe Left(HolidayStopFailure("Original rate plan charge has no charged through date.  A bill run is needed to fix this."))
  }
}
