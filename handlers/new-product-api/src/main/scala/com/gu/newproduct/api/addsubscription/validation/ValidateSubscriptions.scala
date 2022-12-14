package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.validation.Validation.BooleanValidation
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.{Active, Subscription}
import com.gu.newproduct.api.productcatalog.ZuoraIds.ProductRatePlanId

object ValidateSubscriptions {
  def apply(bannedRateplans: List[ProductRatePlanId], validationFailedMessage: String)(
      subscriptions: List[Subscription],
  ): ValidationResult[List[Subscription]] = {
    def hasActiveBannedPlan = hasActiveRateplans(bannedRateplans) _

    val validationResult = !subscriptions.exists(hasActiveBannedPlan) orFailWith validationFailedMessage

    validationResult.map(_ => subscriptions)
  }

  def hasActiveRateplans(targetRatePlanIds: List[ProductRatePlanId])(s: Subscription) =
    s.status == Active && s.productRateplanIds.exists(targetRatePlanIds.contains(_))
}
