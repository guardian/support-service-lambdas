package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.validation.Validation.BooleanValidation
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.{Active, Subscription}
import com.gu.newproduct.api.productcatalog.ZuoraIds.ProductRatePlanId

object ValidateSubscriptions {
  def apply(contributionRatePlanIds: List[ProductRatePlanId])(subscriptions: List[Subscription]): ValidationResult[List[Subscription]] = {
    def hasActiveContributions = hasActiveRateplans(contributionRatePlanIds) _

    val validationResult = !subscriptions.exists(hasActiveContributions) orFailWith "Zuora account already has an active recurring contribution subscription"

    validationResult.map(_ => subscriptions)
  }

  def hasActiveRateplans(targetRatePlanIds: List[ProductRatePlanId])(s: Subscription) =
    s.status == Active && s.productRateplanIds.exists(targetRatePlanIds.contains(_))
}
