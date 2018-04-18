package com.gu.digitalSubscriptionExpiry.zuora

import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.SubscriptionResult
import com.gu.util.apigateway.URLParams

object SkipActivationDateUpdate {

  def apply(queryStringParameters: Option[URLParams], subscription: SubscriptionResult): Boolean = {
    val skipActivationWithParameter = queryStringParameters.map(_.noActivation).contains(true)

    val dateAlreadyPresent = subscription.casActivationDate.isDefined

    skipActivationWithParameter || dateAlreadyPresent
  }

}
