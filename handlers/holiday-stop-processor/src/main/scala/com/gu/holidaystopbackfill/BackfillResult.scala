package com.gu.holidaystopbackfill

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.NewHolidayStopRequest
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.ActionedHolidayStopRequestsDetailToBackfill

case class BackfillResult(
  requests: List[NewHolidayStopRequest],
  zuoraRefs: List[ActionedHolidayStopRequestsDetailToBackfill]
)
