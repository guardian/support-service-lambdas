package com.gu.holiday_stops

// FIXME: Is this assumption safe?
object BillingPeriodToApproxWeekCount {
  def apply(subscriptionNumber: String, billingPeriod: String): Int =
    billingPeriod match {
      case "Quarter" => 13
      case "Annual" => 52
      case "Month" => 4
      case _ => throw new RuntimeException(
        s"Failed to convert billing period to weeks because subscription: $subscriptionNumber had unexpected " +
          s"billing period: $billingPeriod"
      )
    }
}
