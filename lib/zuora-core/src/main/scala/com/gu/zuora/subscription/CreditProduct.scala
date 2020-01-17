package com.gu.zuora.subscription

/**
 * Type of credit amendment to add to a Zuora subscription.
 */
trait CreditProduct {
  def productRatePlanId: String
  def productRatePlanChargeId: String
}
