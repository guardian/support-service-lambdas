package com.gu.holiday_stops

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.{HolidayStopRequest, HolidayStopRequestEndDate, HolidayStopRequestStartDate, NewHolidayStopRequest, ProductName, SubscriptionNameLookup}
import com.gu.salesforce.holiday_stops.SalesforceSFSubscription.SubscriptionName
import org.joda.time.LocalDate

case class HolidayStopRequestsGET(
  productSpecifics: Option[ProductSpecifics],
  existing: List[HolidayStopRequestEXTERNAL]
)

object HolidayStopRequestsGET {

  def apply(sfHSRs: List[HolidayStopRequest], optionalProductNamePrefix: Option[ProductName]): HolidayStopRequestsGET = {
    val optionalProductSpecifics = optionalProductNamePrefix.map(
      productNamePrefix => ActionCalculator.getProductSpecifics(productNamePrefix)
    )
    HolidayStopRequestsGET(
      optionalProductSpecifics,
      sfHSRs.map(HolidayStopRequestEXTERNAL.fromSF(optionalProductSpecifics.map(_.firstAvailableDate)))
    )
  }

}

case class MutabilityFlags(
  isDeletable: Boolean,
  isEditable: Boolean
)

case class HolidayStopRequestEXTERNAL(
  id: Option[String],
  start: String,
  end: String,
  subscriptionName: SubscriptionName,
  mutabilityFlags: Option[MutabilityFlags],
  publicationDatesToBeStopped: Option[List[LocalDate]]
)

object HolidayStopRequestEXTERNAL {

  def fromSF(firstAvailableDateOption: Option[LocalDate])(sfHSR: HolidayStopRequest): HolidayStopRequestEXTERNAL = HolidayStopRequestEXTERNAL(
    id = Some(sfHSR.Id.value),
    start = sfHSR.Start_Date__c.value.toString(),
    end = sfHSR.End_Date__c.value.toString(),
    subscriptionName = sfHSR.Subscription_Name__c,
    mutabilityFlags = firstAvailableDateOption.map(
      calculateMutabilityFlags(
        sfHSR.Actioned_Count__c.value,
        sfHSR.End_Date__c.value
      )
    ),
    publicationDatesToBeStopped = Some(ActionCalculator.publicationDatesToBeStopped(sfHSR))
  )

  def toSF(externalHSR: HolidayStopRequestEXTERNAL): NewHolidayStopRequest = NewHolidayStopRequest(
    Start_Date__c = HolidayStopRequestStartDate(LocalDate.parse(externalHSR.start)),
    End_Date__c = HolidayStopRequestEndDate(LocalDate.parse(externalHSR.end)),
    SF_Subscription__r = SubscriptionNameLookup(externalHSR.subscriptionName)
  )

  def calculateMutabilityFlags(actionedCount: Int, endDate: LocalDate)(firstAvailableDate: LocalDate): MutabilityFlags = {
    if (actionedCount == 0 && firstAvailableDate.isAfter(LocalDate.now())) {
      // TODO log warning (with CloudWatch alert) as indicates processing of holiday stop is well overdue
    }
    // TODO perhaps also check that actioned count is expected value and alert if not
    MutabilityFlags(
      isDeletable = actionedCount == 0,
      isEditable = firstAvailableDate.isBefore(endDate)
    )
  }

}

