package com.gu.holidaystopprocessor

import scala.math.BigDecimal.RoundingMode

object HolidayCredit {

  def apply(subscription: Subscription): Double = {
    def roundUp(d: Double): Double =
      BigDecimal(d).setScale(2, RoundingMode.UP).toDouble
    subscription.originalRatePlanCharge map { charge =>
      val recurringPayment = charge.price
      val numPublicationsInPeriod = charge.weekCountApprox
      -roundUp(recurringPayment / numPublicationsInPeriod)
    } getOrElse 0
  }
}
