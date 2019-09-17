package com.gu.holiday_stops

import java.time.LocalDate

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.SubscriptionName
import com.gu.util.Logging
import com.softwaremill.sttp.{Id, SttpBackend}

object CreditCalculator {

  type PartiallyWiredCreditCalculator = (SubscriptionName, LocalDate) => Either[HolidayError, Double]

  implicit class HolidayErrorImplicits[T](theEither: Either[HolidayError, T]) extends Logging {

    def logError: Either[HolidayError, T] = {
      theEither.left.map(err => logger.error(s"Failed to calculate holiday stop credits because : " + err.reason))
      theEither
    }

  }

  def apply(
    config: Config,
    backend: SttpBackend[Id, Nothing]
  )(
    subscriptionName: SubscriptionName,
    stoppedPublicationDate: LocalDate
  ): Either[HolidayError, Double] =
    for {
      accessToken <- Zuora.accessTokenGetResponse(config.zuoraConfig, backend).logError
      subscription <- Zuora.subscriptionGetResponse(config, accessToken, backend)(subscriptionName).logError
      credit <- guardianWeeklyCredit(
        config.guardianWeeklyConfig.productRatePlanIds,
        config.guardianWeeklyConfig.nForNProductRatePlanIds,
        stoppedPublicationDate
      )(subscription).logError
    } yield credit

  def guardianWeeklyCredit(guardianWeeklyProductRatePlanIds: List[String], gwNforNProductRatePlanIds: List[String], stoppedPublicationDate: LocalDate)(subscription: Subscription): Either[ZuoraHolidayWriteError, Double] =
    CurrentGuardianWeeklySubscription(subscription, guardianWeeklyProductRatePlanIds, gwNforNProductRatePlanIds)
      .map(HolidayCredit(_, stoppedPublicationDate))
}
