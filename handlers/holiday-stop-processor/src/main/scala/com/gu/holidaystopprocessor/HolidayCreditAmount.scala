package com.gu.holidaystopprocessor

import scala.math.BigDecimal.RoundingMode

object HolidayCreditAmount {

  def apply(charge: RatePlanCharge): Double = {
    def roundUp(d: Double): Double = BigDecimal(d).setScale(2, RoundingMode.UP).toDouble
    val recurringPayment = charge.price
    val numPublicationsInPeriod = charge.weekCountApprox
    -roundUp(recurringPayment / numPublicationsInPeriod)
  }
}
