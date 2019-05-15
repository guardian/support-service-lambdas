package com.gu.zuoragwholidaystop

object Fixtures {

  def mkSubscription(price: Double, billingPeriod: String) =
    Subscription(
      autoRenew = true,
      ratePlans = Seq(
        RatePlan(
          productName = "Guardian Weekly",
          ratePlanCharges = Seq(RatePlanCharge(price, billingPeriod))
        )
      )
    )
}
