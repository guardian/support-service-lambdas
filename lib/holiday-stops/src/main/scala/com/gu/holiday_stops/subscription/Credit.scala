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
      .orElse(voucherCredit(config.saturdayVoucherConfig.productRatePlanId, stoppedPublicationDate)(subscription))
      .orElse(voucherCredit(config.sundayVoucherConfig.productRatePlanId, stoppedPublicationDate)(subscription))
      .orElse(voucherCredit(config.weekendVoucherConfig.productRatePlanId, stoppedPublicationDate)(subscription))
      .orElse(voucherCredit(config.sixdayVoucherConfig.productRatePlanId, stoppedPublicationDate)(subscription))
      .orElse(voucherCredit(config.everydayVoucherConfig.productRatePlanId, stoppedPublicationDate)(subscription))
      .orElse(voucherCredit(config.everydayPlusVoucherConfig.productRatePlanId, stoppedPublicationDate)(subscription))
      .orElse(voucherCredit(config.sixdayPlusVoucherConfig.productRatePlanId, stoppedPublicationDate)(subscription))
      .orElse(voucherCredit(config.weekendPlusVoucherConfig.productRatePlanId, stoppedPublicationDate)(subscription))
      .orElse(voucherCredit(config.sundayPlusVoucherConfig.productRatePlanId, stoppedPublicationDate)(subscription))
      .orElse(voucherCredit(config.saturdayPlusVoucherConfig.productRatePlanId, stoppedPublicationDate)(subscription))
      .orElse(Left(ZuoraHolidayError(s"Failed to calculate holiday stop credits for ${subscription.subscriptionNumber}")))

  def guardianWeeklyCredit(config: Config, stoppedPublicationDate: LocalDate)(subscription: Subscription): Either[ZuoraHolidayError, Double] =
    CurrentGuardianWeeklySubscription(subscription, config).map(GuardianWeeklyHolidayCredit(_, stoppedPublicationDate))

  def voucherCredit(voucherProductRatePlanId: String, stoppedPublicationDate: LocalDate)(subscription: Subscription): Either[ZuoraHolidayError, Double] =
    VoucherSubscription(subscription, voucherProductRatePlanId, StoppedPublicationDate(stoppedPublicationDate)).map(VoucherHolidayCredit(_))
}