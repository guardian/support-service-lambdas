package com.gu.zuoragwholidaystop

case class Subscription(
    autoRenew: Boolean,
    ratePlans: Seq[RatePlan]
)

case class RatePlan(
    productName: String,
    ratePlanCharges: Seq[RatePlanCharge]
)

case class RatePlanCharge(price: Double, billingPeriod: String) {

  val weekCount: Int = {
    // inexact values
    billingPeriod match {
      case "Month"   => 4
      case "Quarter" => 12
      case "Annual"  => 52
    }
  }
}
