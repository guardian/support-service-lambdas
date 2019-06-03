package com.gu.holidaystopprocessor

import java.time.LocalDate

case class Subscription(
  subscriptionNumber: String,
  termEndDate: LocalDate,
  currentTerm: Int,
  currentTermPeriodType: String,
  autoRenew: Boolean,
  ratePlans: Seq[RatePlan]
) {

  val originalRatePlanCharge: Option[RatePlanCharge] = {
    val chronologicallyOrderedRatePlans = ratePlans.sortBy { plan =>
      plan.ratePlanCharges.map(_.effectiveStartDate.toString).headOption.getOrElse("")
    }
    for {
      ratePlan <- chronologicallyOrderedRatePlans.headOption
      charge <- ratePlan.ratePlanCharges.headOption
    } yield charge
  }
}

case class RatePlan(
  productName: String,
  ratePlanCharges: Seq[RatePlanCharge]
)

case class RatePlanCharge(
  price: Double,
  billingPeriod: Option[String],
  effectiveStartDate: LocalDate,
  effectiveEndDate: LocalDate
) {

  val weekCountApprox: Int = {
    val default = 52
    billingPeriod map {
      case "Month" => 4
      case "Quarter" => 13
      case "Annual" => 52
      case _ => default
    } getOrElse default
  }
}
