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

    def applyStop(
      subscription: Subscription
    ): Either[String, HolidayStopResponse] = {
      val update = SubscriptionUpdate.holidayCreditToAdd(
        config.holidayCreditProductRatePlanId,
        config.holidayCreditProductRatePlanChargeId,
        subscription,
        stop.stoppedPublicationDate
      )
      for {
        _ <- updateSubscription(subscription, update)
        amendment <- getLastAmendment(subscription)
      } yield HolidayStopResponse(amendment.code, update.price)
    }

    getSubscription(stop.subscriptionName) flatMap { subscription =>
      if (subscription.autoRenew) {
        applyStop(subscription)
      } else Left("Cannot currently process non-auto-renewing subscription")
    }
  }
}
