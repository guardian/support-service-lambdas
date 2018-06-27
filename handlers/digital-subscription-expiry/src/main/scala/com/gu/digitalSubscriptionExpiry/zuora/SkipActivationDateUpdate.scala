package com.gu.digitalSubscriptionExpiry.zuora

import com.gu.digitalSubscriptionExpiry.UrlParams
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.SubscriptionResult

object SkipActivationDateUpdate {

  def apply(queryStringParameters: UrlParams, subscription: SubscriptionResult): Boolean = {
    queryStringParameters.noActivation || subscription.casActivationDate.isDefined
  }

}
