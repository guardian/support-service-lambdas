package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.productcatalog.PlanId
import com.gu.newproduct.api.addsubscription.validation.Validation._

object ValidatePlan {
  def apply(planId: PlanId): ValidationResult[Unit] = {
    val requestingMonthlyContribution = planId.value == "monthly_contribution" // FIXME use the plan name from the catalog once available
    val monthlyValid = requestingMonthlyContribution orFailWith """unsupported plan: only {"planId": "monthly_contribution"} so far"""
    monthlyValid
  }
}
