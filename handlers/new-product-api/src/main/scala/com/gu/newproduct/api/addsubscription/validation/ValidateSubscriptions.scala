package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.ZuoraIds.ProductRatePlanId
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.{Active, Subscription}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientFailableOp

object ValidateSubscriptions extends Validation {
  def apply(
    getAccountSubscriptions: ZuoraAccountId => ClientFailableOp[List[Subscription]],
    contributionRatePlanIds: List[ProductRatePlanId]
  )(accountId: ZuoraAccountId): ApiGatewayOp[Unit] = {
    def hasActiveContributions(s: Subscription) = s.status == Active && s.productRateplanIds.exists(contributionRatePlanIds.contains(_))

    for {
      subscriptions <- getAccountSubscriptions(accountId).toApiGatewayOp("load subscriptions for Zuora account")
      _ <- check(!subscriptions.exists(hasActiveContributions), ifFalseReturn = "Zuora account already has an active recurring contribution subscription")
    } yield ()

  }
}

