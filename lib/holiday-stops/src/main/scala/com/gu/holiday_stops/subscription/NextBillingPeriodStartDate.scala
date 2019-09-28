package com.gu.holiday_stops.subscription

import java.time.LocalDate

import cats.syntax.either._
import com.gu.holiday_stops.{Config, ZuoraHolidayError}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate

/**
 * Holiday credit is applied to the next invoice on the first day of the next billing period.
 *
 * 'Invoiced period' or `billing period that has already been invoiced` is defined as
 * [processedThroughDate, chargedThroughDate) meaning
 *   - from processedThroughDate inclusive
 *   - to chargedThroughDate exclusive
 *
 * Hence chargedThroughDate represents the first day of the next billing period. For quarterly
 * billing period this would be the first day of the next quarter, whilst for annual this would be
 * the first day of the next year.
 *
 * Note chargedThroughDate is an API concept. The UI and the actual invoice use the term 'Service Period'
 * where from and to dates are both inclusive.
 *
 * Note nextBillingPeriodStartDate represents a specific date yyyy-mm-dd unlike billingPeriod (quarterly)
 * or billingPeriodStartDay (1st of month).
 *
 * There is a complication when reader has N-for-N intro plan (for example, GW Oct 18 - Six for Six - Domestic).
 * If the holiday falls within N-for-N then credit should be applied on the first regular invoice, not the next billing
 * period of GW regular plan.
 */

object NextBillingPeriodStartDate {
  def apply(config: Config, subscription: Subscription, stoppedPublicationDate: LocalDate): Either[ZuoraHolidayError, LocalDate] = {
    guardianWeeklyBillingPeriodStartDate(config, subscription, stoppedPublicationDate)
      .orElse(voucherBillingPeriodStartDate(config.sundayVoucherConfig.productRatePlanId, subscription, StoppedPublicationDate(stoppedPublicationDate)))
      .orElse(voucherBillingPeriodStartDate(config.weekendVoucherConfig.productRatePlanId, subscription, StoppedPublicationDate(stoppedPublicationDate)))
      .orElse(voucherBillingPeriodStartDate(config.sixdayVoucherConfig.productRatePlanId, subscription, StoppedPublicationDate(stoppedPublicationDate)))
      .orElse(voucherBillingPeriodStartDate(config.everydayVoucherConfig.productRatePlanId, subscription, StoppedPublicationDate(stoppedPublicationDate)))
      .orElse(voucherBillingPeriodStartDate(config.everydayPlusVoucherConfig.productRatePlanId, subscription, StoppedPublicationDate(stoppedPublicationDate)))
      .orElse(voucherBillingPeriodStartDate(config.sixdayPlusVoucherConfig.productRatePlanId, subscription, StoppedPublicationDate(stoppedPublicationDate)))
      .orElse(voucherBillingPeriodStartDate(config.weekendPlusVoucherConfig.productRatePlanId, subscription, StoppedPublicationDate(stoppedPublicationDate)))
      .orElse(voucherBillingPeriodStartDate(config.sundayPlusVoucherConfig.productRatePlanId, subscription, StoppedPublicationDate(stoppedPublicationDate)))
      .orElse(voucherBillingPeriodStartDate(config.saturdayPlusVoucherConfig.productRatePlanId, subscription, StoppedPublicationDate(stoppedPublicationDate)))
      .orElse(Left(ZuoraHolidayError(s"Failed to calculate when to apply holiday credit: $subscription")))
  }

  def guardianWeeklyBillingPeriodStartDate(config: Config, subscription: Subscription, stoppedPublicationDate: LocalDate): Either[ZuoraHolidayError, LocalDate] =
    CurrentGuardianWeeklySubscription(subscription, config).map { currentGuardianWeeklySubscription =>
      currentGuardianWeeklySubscription.introNforNMode match {
        case Some(introPlan) =>
          if (stoppedPublicationDate.isBefore(currentGuardianWeeklySubscription.invoicedPeriod.startDateIncluding))
            introPlan.invoicedPeriod.endDateExcluding
          else
            currentGuardianWeeklySubscription.invoicedPeriod.endDateExcluding

        case None /* regular plan */ =>
          currentGuardianWeeklySubscription.invoicedPeriod.endDateExcluding
      }
    }

  def voucherBillingPeriodStartDate(voucherProductRatePlanId: String, subscription: Subscription, stoppedPublicationDate: StoppedPublicationDate): Either[ZuoraHolidayError, LocalDate] =
    VoucherSubscription(subscription, voucherProductRatePlanId, stoppedPublicationDate).map(_.invoicedPeriod.endDateExcluding)
}
