package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.ZuoraIds.ProductRatePlanId
import com.gu.newproduct.api.addsubscription.validation.Validation.BooleanValidation
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.{Active, Subscription}

object ValidateSubscriptions {
  def apply(contributionRatePlanIds: List[ProductRatePlanId])(subscriptions: List[Subscription]): ValidationResult[Unit] = {
    def hasActiveContributions = hasActiveRateplans(contributionRatePlanIds) _
    !subscriptions.exists(hasActiveContributions) ifFalseReturn "Zuora account already has an active recurring contribution subscription"
  }

  def hasActiveRateplans(targetRatePlanIds: List[ProductRatePlanId])(s: Subscription) =
    s.status == Active && s.productRateplanIds.exists(targetRatePlanIds.contains(_))
}

