package com.gu.holiday_stops

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.SubscriptionName

object CreditCalculator {

  /*
   * This is an effectful high-level function, so seems safe to fetch Config as part of it.
   * Assuming client will cache results and not need to make more use of Zuora in the same session.
   */
  def guardianWeeklyEstimatedCredit(subscriptionName: SubscriptionName): Either[HolidayError, Double] =
    for {
      config <- Config()
      accessToken <- Zuora.accessTokenGetResponse(config.zuoraConfig)
      subscription <- Zuora.subscriptionGetResponse(config, accessToken)(subscriptionName)
      credit <- guardianWeeklyCredit(config.guardianWeeklyProductRatePlanIds)(subscription)
    } yield credit

  def guardianWeeklyCredit(guardianWeeklyProductRatePlanIds: List[String])(subscription: Subscription): Either[ZuoraHolidayWriteError, Double] =
    CurrentGuardianWeeklySubscription(subscription, guardianWeeklyProductRatePlanIds).map(HolidayCredit(_))
}
