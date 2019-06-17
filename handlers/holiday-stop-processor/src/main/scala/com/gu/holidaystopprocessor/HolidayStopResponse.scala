package com.gu.holidaystopprocessor

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.HolidayStopRequestId
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestActionedZuoraRef.{HolidayStopRequestActionedZuoraChargeCode, HolidayStopRequestActionedZuoraChargePrice, StoppedPublicationDate}

case class HolidayStopResponse(
  requestId: HolidayStopRequestId,
  amendmentCode: HolidayStopRequestActionedZuoraChargeCode,
  price: HolidayStopRequestActionedZuoraChargePrice,
  pubDate: StoppedPublicationDate
)
