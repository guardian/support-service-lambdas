package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holidaystopprocessor.SubscriptionUpdate.holidayCreditToAdd
import org.scalatest.{FlatSpec, Matchers}

class SubscriptionUpdateTest extends FlatSpec with Matchers {

  private val config = Config(ZuoraAccess("", "", ""), "ratePlanId", "ratePlanChargeId")

  "holidayCreditToAdd" should "generate update correctly" in {
    val update = holidayCreditToAdd(
      config,
      subscription = Fixtures.mkSubscription(
        termEndDate = LocalDate.of(2020, 7, 12),
        price = 42.1,
        billingPeriod = "Quarter",
        effectiveEndDate = LocalDate.of(2020, 5, 3)
      ),
      stoppedPublicationDate = LocalDate.of(2019, 5, 18)
    )
    update shouldBe SubscriptionUpdate(
      currentTerm = None,
      Seq(
        Add(
          productRatePlanId = "ratePlanId",
          contractEffectiveDate = LocalDate.of(2020, 5, 3),
          customerAcceptanceDate = LocalDate.of(2020, 5, 3),
          serviceActivationDate = LocalDate.of(2020, 5, 3),
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
    )
  }

  it should "generate update correctly when current term too short" in {
    val update = holidayCreditToAdd(
      config,
      subscription = Fixtures.mkSubscription(
        termEndDate = LocalDate.of(2019, 12, 1),
        price = 42.1,
        billingPeriod = "Quarter",
        effectiveEndDate = LocalDate.of(2020, 5, 3)
      ),
      stoppedPublicationDate = LocalDate.of(2019, 5, 18)
    )
    update shouldBe SubscriptionUpdate(
      currentTerm = Some(24),
      Seq(
        Add(
          productRatePlanId = "ratePlanId",
          contractEffectiveDate = LocalDate.of(2020, 5, 3),
          customerAcceptanceDate = LocalDate.of(2020, 5, 3),
          serviceActivationDate = LocalDate.of(2020, 5, 3),
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
    )
  }
}
