package com.gu.zuoragwholidaystop

import scala.math.BigDecimal.RoundingMode

object Credit {

  def autoRenewingHolidayCredit(subscription: Subscription): Double = {
    def roundUp(d: Double): Double =
      BigDecimal(d).setScale(2, RoundingMode.UP).toDouble
    val credit = for {
      ratePlan <- subscription.ratePlans.lastOption
      charge <- ratePlan.ratePlanCharges.headOption
      recurringPayment = charge.price
      numPublicationsInPeriod = charge.weekCount
    } yield -roundUp(recurringPayment / numPublicationsInPeriod)
    credit getOrElse 0
  }
}
