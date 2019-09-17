package com.gu.holiday_stops

import java.time.LocalDate

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.SubscriptionName
import com.softwaremill.sttp.{Id, SttpBackend}

object CreditCalculator {

  type PartiallyWiredCreditCalculator = (SubscriptionName, LocalDate) => Either[HolidayError, Double]

  def apply(
    config: Config,
    backend: SttpBackend[Id, Nothing]
  )(
    subscriptionName: SubscriptionName,
    stoppedPublicationDate: LocalDate
  ): Either[HolidayError, Double] =
    for {
      accessToken <- Zuora.accessTokenGetResponse(config.zuoraConfig, backend)
      subscription <- Zuora.subscriptionGetResponse(config, accessToken, backend)(subscriptionName)
      credit <- guardianWeeklyCredit(
        config.guardianWeeklyConfig.productRatePlanIds,
        config.guardianWeeklyConfig.nForNProductRatePlanIds,
        stoppedPublicationDate
      )(subscription)
    } yield credit //TODO log failures

  def guardianWeeklyCredit(guardianWeeklyProductRatePlanIds: List[String], gwNforNProductRatePlanIds: List[String], stoppedPublicationDate: LocalDate)(subscription: Subscription): Either[ZuoraHolidayWriteError, Double] =
    CurrentGuardianWeeklySubscription(subscription, guardianWeeklyProductRatePlanIds, gwNforNProductRatePlanIds)
      .map(HolidayCredit(_, stoppedPublicationDate))
}
