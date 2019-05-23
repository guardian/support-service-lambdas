package com.gu.holidaystopprocessor

object HolidayStopProcess {

  def apply(
    config: Config,
    stop: HolidayStop
  ): Either[String, HolidayStopResponse] = {
    config.getSubscription(stop.subscriptionName) flatMap {
      subscription =>
        if (subscription.autoRenew) {
          val update = SubscriptionUpdate.holidayCreditToAdd(
            config.holidayCreditProductRatePlanId,
            config.holidayCreditProductRatePlanChargeId,
            subscription,
            stop.stoppedPublicationDate
          )
          config.updateSubscription(subscription, update) flatMap { _ =>
            config.getLastAmendment(subscription) map { amendment =>
              HolidayStopResponse(amendment.code, update.price)
            }
          }
        } else Left("Cannot currently process non-auto-renewing subscription")
    }
  }
}
