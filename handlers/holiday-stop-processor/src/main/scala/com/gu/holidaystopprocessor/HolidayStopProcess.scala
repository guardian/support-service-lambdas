package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.HolidayStopRequest
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestActionedZuoraRef.{HolidayStopRequestActionedZuoraChargeCode, HolidayStopRequestActionedZuoraChargePrice, StoppedPublicationDate}

object HolidayStopProcess {

  def apply(config: Config): ProcessResult =
    Zuora.accessTokenGetResponse(config.zuoraConfig) map { zuoraAccessToken =>
      processHolidayStops(
        config,
        getRequests = Salesforce.holidayStopRequests(config.sfConfig),
        getSubscription = Zuora.subscriptionGetResponse(config, zuoraAccessToken),
        updateSubscription = Zuora.subscriptionUpdateResponse(config, zuoraAccessToken),
        exportAddedCharges = Salesforce.holidayStopUpdateResponse(config.sfConfig)
      )
    } fold (ProcessResult.fromOverallFailure, identity)

  def processHolidayStops(
    config: Config,
    getRequests: String => Either[OverallFailure, Seq[HolidayStopRequest]],
    getSubscription: String => Either[HolidayStopFailure, Subscription],
    updateSubscription: (Subscription, SubscriptionUpdate) => Either[HolidayStopFailure, Unit],
    exportAddedCharges: Seq[HolidayStopResponse] => Either[OverallFailure, Unit]
  ): ProcessResult = {
    HolidayStop.holidayStopsToApply(getRequests) match {
      case Left(failure) => ProcessResult(
        holidayStopsToApply = Nil,
        holidayStopResults = Nil,
        overallFailure = Some(failure)
      )
      case Right(holidayStops) =>
        val responses = holidayStops map {
          processHolidayStop(
            config,
            getSubscription,
            updateSubscription
          )
        }
        val exportResult = exportAddedCharges(
          responses.collect { case Right(successes) => successes }
        )
        ProcessResult(
          holidayStopsToApply = holidayStops,
          holidayStopResults = responses,
          overallFailure = exportResult.left.toOption
        )
    }
  }

  def processHolidayStop(
    config: Config,
    getSubscription: String => Either[HolidayStopFailure, Subscription],
    updateSubscription: (Subscription, SubscriptionUpdate) => Either[HolidayStopFailure, Unit]
  )(stop: HolidayStop): Either[HolidayStopFailure, HolidayStopResponse] =
    for {
      subscription <- getSubscription(stop.subscriptionName)
      _ <- if (subscription.autoRenew) Right(()) else Left(HolidayStopFailure("Cannot currently process non-auto-renewing subscription"))
      update <- SubscriptionUpdate.holidayCreditToAdd(config, subscription, stop.stoppedPublicationDate)
      _ <- if (subscription.hasHolidayStop(stop)) Right(()) else updateSubscription(subscription, update)
      updatedSubscription <- getSubscription(stop.subscriptionName)
      addedCharge <- updatedSubscription.ratePlanCharge(stop).toRight(HolidayStopFailure("Failed to add charge to subscription"))
    } yield {
      HolidayStopResponse(
        stop.requestId,
        HolidayStopRequestActionedZuoraChargeCode(addedCharge.number),
        HolidayStopRequestActionedZuoraChargePrice(addedCharge.price),
        StoppedPublicationDate(addedCharge.HolidayStart__c.getOrElse(LocalDate.MIN))
      )
    }
}
