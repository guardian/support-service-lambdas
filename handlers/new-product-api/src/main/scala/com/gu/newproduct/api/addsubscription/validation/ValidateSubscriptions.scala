package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.ZuoraIds.ProductRatePlanId
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.{Active, Subscription}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientFailableOp
import Validation.BooleanValidation

object ValidateSubscriptions {
  def apply(
    getAccountSubscriptions: ZuoraAccountId => ClientFailableOp[List[Subscription]],
    contributionRatePlanIds: List[ProductRatePlanId]
  )(accountId: ZuoraAccountId): ApiGatewayOp[Unit] = {

    for {
      subscriptions <- getAccountSubscriptions(accountId).toApiGatewayOp("load subscriptions for Zuora account")
      hasActiveContributions = hasActiveRateplans(contributionRatePlanIds) _
      _ <- (!subscriptions.exists(hasActiveContributions)) ifFalseReturn "Zuora account already has an active recurring contribution subscription"
    } yield ()

  }

  def hasActiveRateplans(targetRatePlanIds: List[ProductRatePlanId])(s: Subscription) =
    s.status == Active && s.productRateplanIds.exists(targetRatePlanIds.contains(_))
}

