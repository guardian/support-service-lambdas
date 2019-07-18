package com.gu.holidaystopbackfill

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.NewHolidayStopRequest
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.HolidayStopRequestsDetail

case class BackfillResult(requests: Seq[NewHolidayStopRequest], zuoraRefs: Seq[HolidayStopRequestsDetail])
