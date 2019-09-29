package com.gu.holiday_stops.subscription

import java.time.LocalDate

import cats.syntax.either._
import com.gu.holiday_stops._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import com.typesafe.scalalogging.LazyLogging

object Credit extends LazyLogging {

  type PartiallyWiredCreditCalculator = (LocalDate, Subscription) => Either[HolidayError, Double]

  def apply(config: Config)(stoppedPublicationDate: LocalDate, subscription: Subscription): Either[ZuoraHolidayError, Double] =
    GuardianWeeklySubscription(subscription, config).map(GuardianWeeklyHolidayCredit(_, stoppedPublicationDate))
      .orElse(VoucherSubscription(subscription, StoppedPublicationDate(stoppedPublicationDate)).map(VoucherHolidayCredit(_)))
      .orElse(Left(ZuoraHolidayError(s"Failed to calculate holiday stop credits for ${subscription.subscriptionNumber}")))
}
