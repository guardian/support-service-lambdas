package com.gu.holiday_stops

import java.time.LocalDate

import cats.syntax.either._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.SubscriptionName
import com.softwaremill.sttp.{Id, SttpBackend}
import com.typesafe.scalalogging.LazyLogging
import mouse.all._

object CreditCalculator extends LazyLogging {

  type PartiallyWiredCreditCalculator = (LocalDate) => Either[ZuoraHolidayWriteError, Double]
  type PartiallyWiredCreditCalculatorFactory = (SubscriptionName) => Either[HolidayError, PartiallyWiredCreditCalculator]

  def apply(
    config: Config,
    backend: SttpBackend[Id, Nothing]
  )(subscriptionName: SubscriptionName): Either[HolidayError, (LocalDate) => Either[ZuoraHolidayWriteError, Double]] = {
    {
      for {
        accessToken <- Zuora.accessTokenGetResponse(config.zuoraConfig, backend)
        subscription <- Zuora.subscriptionGetResponse(config, accessToken, backend)(subscriptionName)
      } yield calculateCredit(
        config.guardianWeeklyConfig.productRatePlanIds,
        config.guardianWeeklyConfig.nForNProductRatePlanIds,
        config.sundayVoucherConfig.productRatePlanChargeId,
        subscription
      ) _ <| (logger.error(s"Failed to calculate credits for subscription $subscription", _))
    } <| (logger.error(s"Failed to get subscription $subscriptionName from zuora", _))
  }

  def calculateCredit(
    guardianWeeklyProductRatePlanIds: List[String],
    gwNforNProductRatePlanIds: List[String],
    sundayVoucherRatePlanId: String,
    subscription: Subscription
  )(stoppedPublicationDate: LocalDate): Either[ZuoraHolidayWriteError, Double] = {
    guardianWeeklyCredit(
      guardianWeeklyProductRatePlanIds,
      gwNforNProductRatePlanIds,
      stoppedPublicationDate
    )(subscription) orElse {
      sundayVoucherCredit(
        sundayVoucherRatePlanId,
        stoppedPublicationDate
      )(subscription)
    } orElse {
      Left(ZuoraHolidayWriteError(s"Could not calculate credit for subscription: ${subscription.subscriptionNumber}"))
    }
  }

  def guardianWeeklyCredit(guardianWeeklyProductRatePlanIds: List[String], gwNforNProductRatePlanIds: List[String], stoppedPublicationDate: LocalDate)(subscription: Subscription): Either[ZuoraHolidayWriteError, Double] =
    CurrentGuardianWeeklySubscription(subscription, guardianWeeklyProductRatePlanIds, gwNforNProductRatePlanIds)
      .map(GuardianWeeklyHolidayCredit(_, stoppedPublicationDate))

  def sundayVoucherCredit(sundayVoucherRatePlanId: String, stoppedPublicationDate: LocalDate)(subscription: Subscription) = {
    CurrentSundayVoucherSubscription(subscription, sundayVoucherRatePlanId)
      .map(SundayVoucherHolidayCredit(_, stoppedPublicationDate))
  }
}
