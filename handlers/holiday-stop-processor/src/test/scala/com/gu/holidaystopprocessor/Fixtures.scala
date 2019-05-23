package com.gu.holidaystopprocessor

import java.time.LocalDate

object Fixtures {

  def mkSubscription(
    termEndDate: LocalDate,
    price: Double,
    billingPeriod: String,
    effectiveEndDate: LocalDate
  ) =
    Subscription(
      subscriptionNumber = "S1",
      termEndDate,
      currentTerm = 12,
      currentTermPeriodType = "Month",
      autoRenew = true,
      ratePlans = Seq(
        RatePlan(
          productName = "Guardian Weekly",
          ratePlanCharges =
            Seq(RatePlanCharge(price, Some(billingPeriod), LocalDate.of(2019, 1, 1), effectiveEndDate))
        )
      )
    )
}
