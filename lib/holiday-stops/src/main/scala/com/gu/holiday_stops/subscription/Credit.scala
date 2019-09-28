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
      .orElse(sundayVoucherCredit(config.sundayVoucherConfig.productRatePlanId, stoppedPublicationDate)(subscription))
      .orElse(weekendVoucherCredit(config.weekendVoucherConfig.productRatePlanId, stoppedPublicationDate)(subscription))
      .orElse(sixdayVoucherCredit(config.sixdayVoucherConfig.productRatePlanId, stoppedPublicationDate)(subscription))
      .orElse(everydayVoucherCredit(config.everydayVoucherConfig.productRatePlanId, stoppedPublicationDate)(subscription))
      .orElse(Left(ZuoraHolidayError(s"Failed to calculate holiday stop credits for ${subscription.subscriptionNumber}")))

  def guardianWeeklyCredit(config: Config, stoppedPublicationDate: LocalDate)(subscription: Subscription): Either[ZuoraHolidayError, Double] =
    CurrentGuardianWeeklySubscription(subscription, config).map(GuardianWeeklyHolidayCredit(_, stoppedPublicationDate))

  def sundayVoucherCredit(voucherProductRatePlanId: String, stoppedPublicationDate: LocalDate)(subscription: Subscription): Either[ZuoraHolidayError, Double] =
    VoucherSubscription(subscription, voucherProductRatePlanId, StoppedPublicationDate(stoppedPublicationDate)).map(VoucherHolidayCredit(_))

  def weekendVoucherCredit(voucherProductRatePlanId: String, stoppedPublicationDate: LocalDate)(subscription: Subscription): Either[ZuoraHolidayError, Double] =
    VoucherSubscription(subscription, voucherProductRatePlanId, StoppedPublicationDate(stoppedPublicationDate)).map(VoucherHolidayCredit(_))

  def sixdayVoucherCredit(voucherProductRatePlanId: String, stoppedPublicationDate: LocalDate)(subscription: Subscription): Either[ZuoraHolidayError, Double] =
    VoucherSubscription(subscription, voucherProductRatePlanId, StoppedPublicationDate(stoppedPublicationDate)).map(VoucherHolidayCredit(_))

  def everydayVoucherCredit(voucherProductRatePlanId: String, stoppedPublicationDate: LocalDate)(subscription: Subscription): Either[ZuoraHolidayError, Double] =
    VoucherSubscription(subscription, voucherProductRatePlanId, StoppedPublicationDate(stoppedPublicationDate)).map(VoucherHolidayCredit(_))
}