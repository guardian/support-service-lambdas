package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holiday_stops._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{HolidayStopRequestsDetail, ProductName, SubscriptionName}

object SundayVoucherHolidayStopProcessor {
  def processHolidayStops(
    config: SundayVoucherHolidayStopConfig,
    getHolidayStopRequestsFromSalesforce: (ProductName, LocalDate) => Either[OverallFailure, List[HolidayStopRequestsDetail]],
    getSubscription: SubscriptionName => Either[ZuoraHolidayWriteError, Subscription],
    updateSubscription: (Subscription, HolidayCreditUpdate) => Either[ZuoraHolidayWriteError, Unit],
    writeHolidayStopsToSalesforce: List[HolidayStopResponse] => Either[SalesforceHolidayWriteError, Unit],
    processDateOverride: Option[LocalDate]
  ): ProcessResult = {
    // FIXME:
    val subscription = getSubscription(SubscriptionName("A-S00051570"))
    val result = CurrentSundayVoucherSubscription(subscription.right.get, SundayVoucherHolidayStopConfig.Dev.productRatePlanChargeId)
    println(result)
    ProcessResult(Nil, Nil, Nil, None)
  }
}
