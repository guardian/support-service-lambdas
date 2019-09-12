package com.gu.holiday_stops

/**
 * Single flattened model representing Holiday Credit product, because there exists
 * one-to-one mapping between productRatePlanId and productRatePlanChargeId.
 */
case class HolidayCreditProduct(
  productRatePlanId: String,
  productRatePlanChargeId: String
)
