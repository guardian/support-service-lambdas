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
      termEndDate,
      currentTerm = 12,
      currentTermPeriodType = "Month",
      autoRenew = true,
      ratePlans = Seq(
        RatePlan(
          productName = "Guardian Weekly",
          ratePlanCharges =
            Seq(RatePlanCharge(price, Some(billingPeriod), effectiveEndDate))
        )
      )
    )
}
