package com.gu.holiday_stops

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.{HolidayStopRequest, ProductName}

case class HolidayStopRequestsGET(
  firstAvailableDate: String,
  existing: List[HolidayStopRequestGET]
)

object HolidayStopRequestsGET {

  def apply(sfHSRs: List[HolidayStopRequest], productNamePrefix: ProductName): HolidayStopRequestsGET = HolidayStopRequestsGET(
    ActionCalculator.firstAvailableDate(productNamePrefix),
    sfHSRs.map(HolidayStopRequestGET.apply)
  )

}

case class HolidayStopRequestGET(
  start: String,
  end: String,
)

object HolidayStopRequestGET {

  def apply(sfHSR: HolidayStopRequest): HolidayStopRequestGET = HolidayStopRequestGET(
    sfHSR.Start_Date__c.value.toString(),
    sfHSR.End_Date__c.value.toString()
//    TODO calculate first editable date within this period (using ActionCalculator and actioned count in sfHSR)

  )

}

