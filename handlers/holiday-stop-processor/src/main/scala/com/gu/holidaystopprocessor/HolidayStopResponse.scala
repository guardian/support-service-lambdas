package com.gu.holidaystopprocessor

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.HolidayStopRequestId
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{HolidayStopRequestsDetailChargeCode, HolidayStopRequestsDetailChargePrice, StoppedPublicationDate}

case class HolidayStopResponse(
  requestId: HolidayStopRequestId,
  chargeCode: HolidayStopRequestsDetailChargeCode,
  price: HolidayStopRequestsDetailChargePrice,
  pubDate: StoppedPublicationDate
)
