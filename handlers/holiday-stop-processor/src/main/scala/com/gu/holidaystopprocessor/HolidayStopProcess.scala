package com.gu.holidaystopprocessor

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.HolidayStopRequest
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestActionedZuoraRef.{HolidayStopRequestActionedZuoraAmendmentCode, HolidayStopRequestActionedZuoraAmendmentPrice}

object HolidayStopProcess {

  def apply(config: Config): Seq[Either[String, HolidayStopResponse]] = {
    val sfCredentials = config.sfCredentials
    val zuoraCredentials = config.zuoraCredentials
    processHolidayStops(
      config,
      getRequests = Salesforce.holidayStopRequests(sfCredentials),
      getSubscription = Zuora.subscriptionGetResponse(zuoraCredentials),
      updateSubscription = Zuora.subscriptionUpdateResponse(zuoraCredentials),
      getLastAmendment = Zuora.lastAmendmentGetResponse(zuoraCredentials),
      exportAmendments = Salesforce.holidayStopUpdateResponse(sfCredentials)
    )
  }

  def processHolidayStops(
    config: Config,
    getRequests: String => Either[String, Seq[HolidayStopRequest]],
    getSubscription: String => Either[String, Subscription],
    updateSubscription: (Subscription, SubscriptionUpdate) => Either[String, Unit],
    getLastAmendment: Subscription => Either[String, Amendment],
    exportAmendments: Seq[HolidayStopResponse] => Either[String, Unit]
  ): Seq[Either[String, HolidayStopResponse]] = {
    val response = processHolidayStop(
      config,
      getSubscription,
      updateSubscription,
      getLastAmendment
    ) _
    HolidayStop.holidayStopsToApply(getRequests) match {
      case Left(msg) => Seq(Left(msg))
      case Right(holidayStops) =>
        val responses = holidayStops.map(response)
        val exportResult = exportAmendments(responses.collect { case Right(successes) => successes })
        exportResult match {
          case Left(msg) => Seq(Left(msg))
          case _ => responses
        }
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
    } yield HolidayStopResponse(
      stop.requestId,
      HolidayStopRequestActionedZuoraAmendmentCode(amendment.code),
      HolidayStopRequestActionedZuoraAmendmentPrice(update.price)
    )
}
