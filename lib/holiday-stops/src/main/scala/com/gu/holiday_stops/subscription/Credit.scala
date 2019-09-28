package com.gu.holiday_stops.subscription

import java.time.LocalDate

import cats.syntax.either._
import com.gu.holiday_stops._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import com.typesafe.scalalogging.LazyLogging

object Credit extends LazyLogging {

  type PartiallyWiredCreditCalculator = (LocalDate, Subscription) => Either[HolidayError, Double]

  def apply(
    config: Config,
  )(stoppedPublicationDate: LocalDate, subscription: Subscription): Either[ZuoraHolidayError, Double] =
    guardianWeeklyCredit(config, stoppedPublicationDate)(subscription)
      .orElse(sundayVoucherCredit(config, stoppedPublicationDate)(subscription))
      .orElse(weekendVoucherCredit(config, stoppedPublicationDate)(subscription))
      .orElse(sixdayVoucherCredit(config, stoppedPublicationDate)(subscription))
      .orElse(everydayVoucherCredit(config, stoppedPublicationDate)(subscription))
      .orElse(Left(ZuoraHolidayError(s"Failed to calculate holiday stop credits for ${subscription.subscriptionNumber}")))

  def guardianWeeklyCredit(config: Config, stoppedPublicationDate: LocalDate)(subscription: Subscription): Either[ZuoraHolidayError, Double] =
    CurrentGuardianWeeklySubscription(subscription, config).map(GuardianWeeklyHolidayCredit(_, stoppedPublicationDate))

  def sundayVoucherCredit(config: Config, stoppedPublicationDate: LocalDate)(subscription: Subscription): Either[ZuoraHolidayError, Double] =
    CurrentSundayVoucherSubscription(subscription, config).map(VoucherHolidayCredit(_))

  def weekendVoucherCredit(config: Config, stoppedPublicationDate: LocalDate)(subscription: Subscription): Either[ZuoraHolidayError, Double] = {
    CurrentWeekendVoucherSubscription(
      subscription,
      config,
      StoppedPublicationDate(stoppedPublicationDate)
    ).map(VoucherHolidayCredit(_))
  }

  def sixdayVoucherCredit(config: Config, stoppedPublicationDate: LocalDate)(subscription: Subscription): Either[ZuoraHolidayError, Double] = {
    CurrentSixdayVoucherSubscription(subscription, config, StoppedPublicationDate(stoppedPublicationDate)).map(VoucherHolidayCredit(_))
  }

  def everydayVoucherCredit(config: Config, stoppedPublicationDate: LocalDate)(subscription: Subscription): Either[ZuoraHolidayError, Double] = {
    CurrentEverydayVoucherSubscription(subscription, config, StoppedPublicationDate(stoppedPublicationDate)).map(VoucherHolidayCredit(_))
  }
}