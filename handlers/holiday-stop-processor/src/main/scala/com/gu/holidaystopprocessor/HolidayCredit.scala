package com.gu.holidaystopprocessor

import scala.math.BigDecimal.RoundingMode

object HolidayCredit {
  def apply(subscription: Subscription): Double = {
    subscription
      .originalRatePlanCharge
      .map(calculateAmount)
      .getOrElse(0) // FIXME: Should we throw instead? Is it possible RPC does not exist?
  }

  def calculateAmount(charge: RatePlanCharge): Double = {
    def roundUp(d: Double): Double = BigDecimal(d).setScale(2, RoundingMode.UP).toDouble
    val recurringPayment = charge.price
    val numPublicationsInPeriod = charge.weekCountApprox
    -roundUp(recurringPayment / numPublicationsInPeriod)
  }
}
