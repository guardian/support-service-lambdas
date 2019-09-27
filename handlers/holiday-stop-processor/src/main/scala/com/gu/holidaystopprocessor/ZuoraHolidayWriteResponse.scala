package com.gu.holidaystopprocessor

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._

case class ZuoraHolidayWriteResponse(
  requestId: HolidayStopRequestsDetailId,
  subscriptionName: SubscriptionName,
  productName: ProductName,
  chargeCode: HolidayStopRequestsDetailChargeCode,
  estimatedPrice: Option[HolidayStopRequestsDetailChargePrice],
  actualPrice: HolidayStopRequestsDetailChargePrice,
  pubDate: StoppedPublicationDate
)
