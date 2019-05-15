package com.gu.holidaystopprocessor

import java.time.LocalDate

case class Subscription(
  termEndDate: LocalDate,
  currentTerm: Int,
  currentTermPeriodType: String,
  autoRenew: Boolean,
  ratePlans: Seq[RatePlan]
) {
  val originalRatePlanCharge: Option[RatePlanCharge] = for {
    ratePlan <- ratePlans.lastOption
    charge <- ratePlan.ratePlanCharges.headOption
  } yield charge
}

case class RatePlan(
  productName: String,
  ratePlanCharges: Seq[RatePlanCharge]
)

case class RatePlanCharge(
  price: Double,
  billingPeriod: Option[String],
  effectiveEndDate: LocalDate
) {
  val weekCount: Int = {
    // inexact values
    billingPeriod map {
      case "Month" => 4
      case "Quarter" => 13
      case "Annual" => 52
    } getOrElse 52
  }
}
