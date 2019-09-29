package com.gu.holiday_stops

object BillingPeriodToApproxWeekCount {
  def apply(billingPeriod: String): Int =
    billingPeriod match {
      case "Quarter" => 13
      case "Annual" => 52
      case "Month" => 4
      case "Specific_Weeks" => 6 // FIXME: When we have others than 6-for-6
      case _ => throw new RuntimeException(s"Failed to convert billing period to weeks because unknown period: $billingPeriod") // FIXME: Either
    }
}
