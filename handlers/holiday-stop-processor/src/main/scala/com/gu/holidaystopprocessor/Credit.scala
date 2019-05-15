package com.gu.holidaystopprocessor

import scala.math.BigDecimal.RoundingMode

object Credit {

  def autoRenewingHolidayAmount(subscription: Subscription): Double = {
    def roundUp(d: Double): Double =
      BigDecimal(d).setScale(2, RoundingMode.UP).toDouble
    subscription.originalRatePlanCharge map { charge =>
      val recurringPayment = charge.price
      val numPublicationsInPeriod = charge.weekCount
      -roundUp(recurringPayment / numPublicationsInPeriod)
    } getOrElse 0
  }
}
