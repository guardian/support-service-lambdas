package com.gu.holidaystopprocessor

object HolidayStopProcess {

  def apply(
    config: Config,
    stop: HolidayStop
  ): Either[String, HolidayStopResponse] = {
    val secretConfig = config.zuoraAccess
    process(
      config,
      getSubscription = Zuora.subscriptionGetResponse(secretConfig),
      updateSubscription = Zuora.subscriptionUpdateResponse(secretConfig),
      getLastAmendment = Zuora.lastAmendmentGetResponse(secretConfig),
      stop
    )
  }

  def process(
    config: Config,
    getSubscription: String => Either[String, Subscription],
    updateSubscription: (Subscription, SubscriptionUpdate) => Either[String, Unit],
    getLastAmendment: Subscription => Either[String, Amendment],
    stop: HolidayStop
  ): Either[String, HolidayStopResponse] = {
    getSubscription(stop.subscriptionName) flatMap { subscription =>
      if (subscription.autoRenew) {
        val update = SubscriptionUpdate.holidayCreditToAdd(
          config.holidayCreditProductRatePlanId,
          config.holidayCreditProductRatePlanChargeId,
          subscription,
          stop.stoppedPublicationDate
        )
        updateSubscription(subscription, update) flatMap { _ =>
          getLastAmendment(subscription) map { amendment =>
            HolidayStopResponse(amendment.code, update.price)
          }
        }
      } else Left("Cannot currently process non-auto-renewing subscription")
    }
  }
}
