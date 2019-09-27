package com.gu.holiday_stops.subscription

import java.time.LocalDate

import cats.syntax.either._
import com.gu.holiday_stops._
import com.typesafe.scalalogging.LazyLogging
import mouse.all._

object CreditCalculator extends LazyLogging {

  type PartiallyWiredCreditCalculator = (LocalDate, Subscription) => Either[HolidayError, Double]

  def calculateCredit(
    config: Config,
  )(stoppedPublicationDate: LocalDate, subscription: Subscription): Either[ZuoraHolidayWriteError, Double] =
    guardianWeeklyCredit(config, stoppedPublicationDate)(subscription)
      .orElse(sundayVoucherCredit(config, stoppedPublicationDate)(subscription))
      .orElse(Left(ZuoraHolidayWriteError(s"Could not calculate credit for subscription: ${subscription.subscriptionNumber}")))
      .<| (logger.error("Failed to calculate holiday stop credits", _))

  def guardianWeeklyCredit(config: Config, stoppedPublicationDate: LocalDate)(subscription: Subscription): Either[ZuoraHolidayWriteError, Double] =
    CurrentGuardianWeeklySubscription(subscription, config).map(GuardianWeeklyHolidayCredit(_, stoppedPublicationDate))

  def sundayVoucherCredit(config: Config, stoppedPublicationDate: LocalDate)(subscription: Subscription): Either[ZuoraHolidayWriteError, Double] =
    CurrentSundayVoucherSubscription(subscription, config).map(SundayVoucherHolidayCredit(_, stoppedPublicationDate))

}
