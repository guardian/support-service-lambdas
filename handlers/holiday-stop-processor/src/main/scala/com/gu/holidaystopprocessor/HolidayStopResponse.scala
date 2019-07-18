package com.gu.holidaystopprocessor

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{HolidayStopRequestsDetailChargeCode, HolidayStopRequestsDetailChargePrice, HolidayStopRequestsDetailId, ProductName, StoppedPublicationDate, SubscriptionName}

case class HolidayStopResponse(
  requestId: HolidayStopRequestsDetailId,
  subscriptionName: SubscriptionName,
  productName: ProductName,
  chargeCode: HolidayStopRequestsDetailChargeCode,
  estimatedPrice: Option[HolidayStopRequestsDetailChargePrice],
  actualPrice: HolidayStopRequestsDetailChargePrice,
  pubDate: StoppedPublicationDate
)
