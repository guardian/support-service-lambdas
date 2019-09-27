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
    sundayVoucherRatePlanId: String
  )(stoppedPublicationDate: LocalDate, subscription: Subscription): Either[ZuoraHolidayWriteError, Double] = {
    guardianWeeklyCredit(
      config,
      stoppedPublicationDate
    )(subscription) orElse {
      sundayVoucherCredit(
        sundayVoucherRatePlanId,
        stoppedPublicationDate
      )(subscription)
    } orElse {
      Left(ZuoraHolidayWriteError(s"Could not calculate credit for subscription: ${subscription.subscriptionNumber}"))
    }
  } <| (logger.error("Failed to calculate holiday stop credits", _))

  def guardianWeeklyCredit(config: Config, stoppedPublicationDate: LocalDate)(subscription: Subscription): Either[ZuoraHolidayWriteError, Double] =
    CurrentGuardianWeeklySubscription(subscription, config).map(GuardianWeeklyHolidayCredit(_, stoppedPublicationDate))

  def sundayVoucherCredit(sundayVoucherRatePlanId: String, stoppedPublicationDate: LocalDate)(subscription: Subscription) = {
    CurrentSundayVoucherSubscription(subscription, sundayVoucherRatePlanId)
      .map(SundayVoucherHolidayCredit(_, stoppedPublicationDate))
  }
}
