package com.gu.holidaystopprocessor

object HolidayStopProcess {

  def apply(config: Config): Seq[Either[String, HolidayStopResponse]] = {
    val zuoraCredentials = config.zuoraCredentials
    val response = processHolidayStop(
      config,
      getSubscription = Zuora.subscriptionGetResponse(zuoraCredentials),
      updateSubscription = Zuora.subscriptionUpdateResponse(zuoraCredentials),
      getLastAmendment = Zuora.lastAmendmentGetResponse(zuoraCredentials)
    ) _
    HolidayStop.holidayStopsToApply(config) match {
      case Left(msg) => Seq(Left(msg))
      case Right(holidayStops) => holidayStops map response
    }
  }

  def processHolidayStop(
    config: Config,
    getSubscription: String => Either[String, Subscription],
    updateSubscription: (Subscription, SubscriptionUpdate) => Either[String, Unit],
    getLastAmendment: Subscription => Either[String, Amendment]
  )(stop: HolidayStop): Either[String, HolidayStopResponse] =
    for {
      subscription <- getSubscription(stop.subscriptionName)
      _ <- if (subscription.autoRenew) Right(()) else Left("Cannot currently process non-auto-renewing subscription")
      update <- Right(SubscriptionUpdate.holidayCreditToAdd(config, subscription, stop.stoppedPublicationDate))
      _ <- updateSubscription(subscription, update)
      amendment <- getLastAmendment(subscription)
    } yield HolidayStopResponse(amendment.code, update.price)
}
