package com.gu.holiday_stops

/**
 * Type of credit amendment to add to a Zuora subscription.
 */
trait CreditProduct {
  def productRatePlanId: String
  def productRatePlanChargeId: String
}
