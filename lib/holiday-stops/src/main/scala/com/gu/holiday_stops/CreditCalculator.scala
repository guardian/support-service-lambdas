package com.gu.holiday_stops

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.SubscriptionName
import com.softwaremill.sttp.{Id, SttpBackend}

object CreditCalculator {
  def guardianWeeklyCredit(
    config: Config,
    subscriptionName: SubscriptionName,
    backend: SttpBackend[Id, Nothing]
  ): Either[HolidayError, Double] =
    for {
      accessToken <- Zuora.accessTokenGetResponse(config.zuoraConfig, backend)
      subscription <- Zuora.subscriptionGetResponse(config, accessToken, backend)(subscriptionName)
      credit <- guardianWeeklyCredit(config.guardianWeeklyProductRatePlanIds)(subscription)
    } yield credit

  def guardianWeeklyCredit(guardianWeeklyProductRatePlanIds: List[String])(subscription: Subscription): Either[ZuoraHolidayWriteError, Double] =
    CurrentGuardianWeeklySubscription(subscription, guardianWeeklyProductRatePlanIds).map(HolidayCredit(_))
}
