package com.gu.zuoragwholidaystop

import java.time.LocalDate

import com.gu.zuoragwholidaystop.SubscriptionUpdate.holidayCreditToAdd
import org.scalatest.{FlatSpec, Matchers}

class SubscriptionUpdateTest extends FlatSpec with Matchers {

  "holidayCreditToAdd" should "calculate credit correctly" in {
    val update = holidayCreditToAdd("ratePlanId", "ratePlanChargeId")(
      subscription = Fixtures.mkSubscription(42.1, "Quarter"),
      stoppedPublicationDate = LocalDate.of(2019, 5, 18)
    )
    update shouldBe SubscriptionUpdate(
      Seq(
        Add(
          productRatePlanId = "ratePlanId",
          contractEffectiveDate = LocalDate.of(2019, 5, 18),
          customerAcceptanceDate = LocalDate.of(2019, 5, 18),
          serviceActivationDate = LocalDate.of(2019, 5, 18),
          chargeOverrides = Seq(
            ChargeOverride(
              productRatePlanChargeId = "ratePlanChargeId",
              HolidayStart__c = LocalDate.of(2019, 5, 18),
              HolidayEnd__c = LocalDate.of(2019, 5, 18),
              price = -3.51
            )
          )
        )
      )
    )
  }
}
