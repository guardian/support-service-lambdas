package com.gu.holiday_stops

import java.time.LocalDate

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.SubscriptionName
import com.softwaremill.sttp.{Id, SttpBackend}

object CreditCalculator {
  def apply(
    config: Config,
    subscriptionName: SubscriptionName,
    backend: SttpBackend[Id, Nothing],
    stoppedPublicationDate: LocalDate
  ): Either[HolidayError, Double] =
    for {
      accessToken <- Zuora.accessTokenGetResponse(config.zuoraConfig, backend)
      subscription <- Zuora.subscriptionGetResponse(config, accessToken, backend)(subscriptionName)
      gwConfig <- guardianWeeklyConfig(config)
      credit <- guardianWeeklyCredit(gwConfig.guardianWeeklyProductRatePlanIds, gwConfig.gwNforNProductRatePlanIds, stoppedPublicationDate)(subscription)
    } yield credit

  def guardianWeeklyConfig(config: Config): Either[HolidayError, GuardianWeeklyHolidayStopConfig] =
    config
      .supportedProductConfig
      .map {
        case gwConfig: GuardianWeeklyHolidayStopConfig => Some(gwConfig)
        case _ => None
      }
      .find(_.isDefined)
      .flatten
      .toRight(OverallFailure("No guardian weekly config available"))

  def guardianWeeklyCredit(guardianWeeklyProductRatePlanIds: List[String], gwNforNProductRatePlanIds: List[String], stoppedPublicationDate: LocalDate)(subscription: Subscription): Either[ZuoraHolidayWriteError, Double] =
    CurrentGuardianWeeklySubscription(subscription, guardianWeeklyProductRatePlanIds, gwNforNProductRatePlanIds)
      .map(HolidayCredit(_, stoppedPublicationDate))
}
