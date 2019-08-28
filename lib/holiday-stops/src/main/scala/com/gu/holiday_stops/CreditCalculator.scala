package com.gu.holiday_stops

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.SubscriptionName

object CreditCalculator {

  def guardianWeeklyCredit(config: Config, subscriptionName: SubscriptionName): Either[HolidayError, Double] =
    for {
      accessToken <- Zuora.accessTokenGetResponse(config.zuoraConfig)
      subscription <- Zuora.subscriptionGetResponse(config, accessToken)(subscriptionName)
      credit <- guardianWeeklyCredit(config.guardianWeeklyProductRatePlanIds)(subscription)
    } yield credit

  def guardianWeeklyCredit(guardianWeeklyProductRatePlanIds: List[String])(subscription: Subscription): Either[ZuoraHolidayWriteError, Double] =
    CurrentGuardianWeeklySubscription(subscription, guardianWeeklyProductRatePlanIds).map(HolidayCredit(_))
}
