package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.ZuoraIds.ProductRatePlanId
import com.gu.newproduct.api.addsubscription.validation.Validation.BooleanValidation
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.{Active, Subscription}

object ValidateSubscriptions {
  def apply(contributionRatePlanIds: List[ProductRatePlanId])(subscriptions: List[Subscription]): ValidationResult[Unit] = {
    def hasActiveContributions = hasActiveRateplans(contributionRatePlanIds) _
    !subscriptions.exists(hasActiveContributions) orFailWith "Zuora account already has an active recurring contribution subscription"
  }

  def hasActiveRateplans(targetRatePlanIds: List[ProductRatePlanId])(s: Subscription) =
    s.status == Active && s.productRateplanIds.exists(targetRatePlanIds.contains(_))
}

object ValidateSubscriptions1 {
  def apply(contributionRatePlanIds: List[ProductRatePlanId])(subscriptions: List[Subscription]): ValidationResult[ List[Subscription]] = {
    def hasActiveContributions = hasActiveRateplans(contributionRatePlanIds) _
    val response = !subscriptions.exists(hasActiveContributions) orFailWith "Zuora account already has an active recurring contribution subscription"

    response.map(_ => subscriptions) //TODO just to make it work, do this is a nicer way
  }

  def hasActiveRateplans(targetRatePlanIds: List[ProductRatePlanId])(s: Subscription) =
    s.status == Active && s.productRateplanIds.exists(targetRatePlanIds.contains(_))
}