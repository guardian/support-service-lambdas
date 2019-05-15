package com.gu.holidaystopprocessor

object HolidayStopProcess {

  def apply(
    config: Config
  )(stop: HolidayStop): Either[String, ZuoraStatusResponse] = {

    val subscriptionDetails =
      Zuora.subscriptionGetResponse(config.zuoraAccess) _

    val updatedSubscription =
      Zuora.subscriptionUpdateResponse(config.zuoraAccess) _

    val holidayCreditToAdd = SubscriptionUpdate.holidayCreditToAdd(config) _

    subscriptionDetails(stop.subscriptionName).right flatMap { subscription =>
      if (subscription.autoRenew) {
        val subscriptionUpdate =
          holidayCreditToAdd(subscription, stop.stoppedPublicationDate)
        updatedSubscription(stop.subscriptionName, subscriptionUpdate)
      } else Left("Cannot currently process non-auto-renewing subscription")
    }
  }
}
