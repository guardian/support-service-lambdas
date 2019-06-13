package com.gu.holiday_stops

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.{HolidayStopRequest, HolidayStopRequestEndDate, HolidayStopRequestStartDate, NewHolidayStopRequest, ProductName, SubscriptionName, SubscriptionNameLookup}
import org.joda.time.LocalDate

case class HolidayStopRequestsGET(
  productSpecifics: Option[ProductSpecifics],
  existing: List[HolidayStopRequestEXTERNAL]
)

object HolidayStopRequestsGET {

  def apply(sfHSRs: List[HolidayStopRequest], optionalProductNamePrefix: Option[ProductName]): HolidayStopRequestsGET = HolidayStopRequestsGET(
    optionalProductNamePrefix.map(productNamePrefix => ActionCalculator.getProductSpecifics(productNamePrefix)),
    sfHSRs.map(HolidayStopRequestEXTERNAL.fromSF)
  )

}

case class HolidayStopRequestEXTERNAL(
  id: Option[String],
  start: String,
  end: String,
  subscriptionName: String,
  actionedCount: Int
)

object HolidayStopRequestEXTERNAL {

  def fromSF(sfHSR: HolidayStopRequest): HolidayStopRequestEXTERNAL = HolidayStopRequestEXTERNAL(
    id = Some(sfHSR.Id.value),
    start = sfHSR.Start_Date__c.value.toString(),
    end = sfHSR.End_Date__c.value.toString(),
    subscriptionName = sfHSR.Subscription_Name__c.value,
    actionedCount = sfHSR.Actioned_Count__c.value
  )

  def toSF(externalHSR: HolidayStopRequestEXTERNAL): NewHolidayStopRequest = NewHolidayStopRequest(
    Start_Date__c = HolidayStopRequestStartDate(LocalDate.parse(externalHSR.start)),
    End_Date__c = HolidayStopRequestEndDate(LocalDate.parse(externalHSR.end)),
    SF_Subscription__r = SubscriptionNameLookup(SubscriptionName(externalHSR.subscriptionName))
  )

}

