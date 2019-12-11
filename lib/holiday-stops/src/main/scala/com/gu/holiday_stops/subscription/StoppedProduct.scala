package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.{ZuoraHolidayError, ZuoraHolidayResponse}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate

object StoppedProduct {
  def apply(subscription: Subscription, stoppedPublicationDate: StoppedPublicationDate): ZuoraHolidayResponse[HolidayStopCredit] =
    for {
      subscriptionInfo <- SubscriptionData(subscription)
      issueDate <- subscriptionInfo.issueDataForDate(stoppedPublicationDate.value)
    } yield {
      HolidayStopCredit(issueDate.credit, nextBillingPeriodStartDate(issueDate.billingPeriod))
    }

  /**
   * This returns the date for the next bill after the stoppedPublicationDate.
   *
   * This currently calculates the current billing period and uses the following day. This is an over simplification
   * but works for current use cases
   *
   * For more details about the calculation of the current billing period see:
   *
   * [[com.gu.holiday_stops.subscription.RatePlanChargeBillingSchedule]]
   *
   * @return Date of the first day of the billing period
   *         following this <code>stoppedPublicationDate</code>.
   *         [[com.gu.holiday_stops.subscription.StoppedProductTest]]
   *         shows examples of the expected outcome.
   */
  private def nextBillingPeriodStartDate(billingPeriod: BillingPeriod): LocalDate = {
    billingPeriod.endDate.plusDays(1)
  }
}
