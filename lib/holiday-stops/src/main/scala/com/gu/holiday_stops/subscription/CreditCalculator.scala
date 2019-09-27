package com.gu.holiday_stops.subscription

import java.time.LocalDate

import cats.syntax.either._
import com.gu.holiday_stops._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import com.typesafe.scalalogging.LazyLogging
import mouse.all._

object CreditCalculator extends LazyLogging {

  type PartiallyWiredCreditCalculator = (LocalDate, Subscription) => Either[HolidayError, Double]

  def calculateCredit(
    guardianWeeklyProductRatePlanIds: List[String],
    gwNforNProductRatePlanIds: List[String],
    sundayVoucherRatePlanId: String,
    weekendVoucherRatePlanId: String
  )(stoppedPublicationDate: LocalDate, subscription: Subscription): Either[ZuoraHolidayWriteError, Double] = {
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
      weekendVoucherCredit(
        weekendVoucherRatePlanId,
        stoppedPublicationDate
      )(subscription)
    } orElse {
      Left(ZuoraHolidayWriteError(s"Could not calculate credit for subscription: ${subscription.subscriptionNumber}"))
    }
  } <| (logger.error("Failed to calculate holiday stop credits", _))

  def guardianWeeklyCredit(guardianWeeklyProductRatePlanIds: List[String], gwNforNProductRatePlanIds: List[String], stoppedPublicationDate: LocalDate)(subscription: Subscription): Either[ZuoraHolidayWriteError, Double] =
    CurrentGuardianWeeklySubscription(subscription, guardianWeeklyProductRatePlanIds, gwNforNProductRatePlanIds)
      .map(GuardianWeeklyHolidayCredit(_, stoppedPublicationDate))

  def sundayVoucherCredit(sundayVoucherRatePlanId: String, stoppedPublicationDate: LocalDate)(subscription: Subscription) = {
    CurrentSundayVoucherSubscription(subscription, sundayVoucherRatePlanId)
      .map(VoucherHolidayCredit(_))
  }

  def weekendVoucherCredit(sundayVoucherRatePlanId: String, stoppedPublicationDate: LocalDate)(subscription: Subscription) = {
    CurrentWeekendVoucherSubscription(
      subscription,
      sundayVoucherRatePlanId,
      StoppedPublicationDate(stoppedPublicationDate)
    ).map(VoucherHolidayCredit(_))
  }
}
