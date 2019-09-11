package com.gu.holidaystopprocessor

import com.gu.holiday_stops._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{HolidayStopRequestsDetail, ProductName, SubscriptionName}

object SundayHolidayStopProcessor {
  def processHolidayStops(
    config: SundayHolidayStopConfig,
    getHolidayStopRequestsFromSalesforce: ProductName => Either[OverallFailure, List[HolidayStopRequestsDetail]],
    getSubscription: SubscriptionName => Either[ZuoraHolidayWriteError, Subscription],
    updateSubscription: (Subscription, HolidayCreditUpdate) => Either[ZuoraHolidayWriteError, Unit],
    writeHolidayStopsToSalesforce: List[HolidayStopResponse] => Either[SalesforceHolidayWriteError, Unit]
  ): ProcessResult =
    ProcessResult(Nil, Nil, Nil, None)
}
