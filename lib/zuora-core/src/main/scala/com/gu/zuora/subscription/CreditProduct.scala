package com.gu.zuora.subscription

/** Type of credit amendment to add to a Zuora subscription.
  */
case class CreditProduct(
    productRatePlanId: String,
    productRatePlanChargeId: String,
    productRatePlanChargeName: String,
)
