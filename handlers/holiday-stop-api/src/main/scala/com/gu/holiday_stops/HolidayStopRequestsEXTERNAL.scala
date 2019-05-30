package com.gu.holiday_stops

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.{HolidayStopRequest, HolidayStopRequestEndDate, HolidayStopRequestStartDate, NewHolidayStopRequest, ProductName, SubscriptionName, SubscriptionNameLookup}
import org.joda.time.LocalDate

case class HolidayStopRequestsGET(
  firstAvailableDate: Option[String],
  existing: List[HolidayStopRequestEXTERNAL]
)

object HolidayStopRequestsGET {

  def apply(sfHSRs: List[HolidayStopRequest], optionalProductNamePrefix: Option[ProductName]): HolidayStopRequestsGET = HolidayStopRequestsGET(
    optionalProductNamePrefix.map(ActionCalculator.firstAvailableDate),
    sfHSRs.map(HolidayStopRequestEXTERNAL.fromSF)
  )

}

case class HolidayStopRequestEXTERNAL(
  start: String,
  end: String,
  subscriptionName: String
)

object HolidayStopRequestEXTERNAL {

  def fromSF(sfHSR: HolidayStopRequest): HolidayStopRequestEXTERNAL = HolidayStopRequestEXTERNAL(
    start = sfHSR.Start_Date__c.value.toString(),
    end = sfHSR.End_Date__c.value.toString(),
    subscriptionName = sfHSR.Subscription_Name__c.value
  // TODO calculate first editable date within this period (using ActionCalculator and actioned count in sfHSR)
  // TODO booleans for partially editable and completely locked
  )

  def toSF(externalHSR: HolidayStopRequestEXTERNAL): NewHolidayStopRequest = NewHolidayStopRequest(
    Start_Date__c = HolidayStopRequestStartDate(LocalDate.parse(externalHSR.start)),
    End_Date__c = HolidayStopRequestEndDate(LocalDate.parse(externalHSR.end)),
    SF_Subscription__r = SubscriptionNameLookup(SubscriptionName(externalHSR.subscriptionName))
  )

}

