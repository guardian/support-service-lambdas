package com.gu.holiday_stops

import java.time.LocalDate

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{ProductName, SubscriptionName}
import play.api.libs.json.{Json, OWrites, Reads}

object WireHolidayStopRequest {

  def apply(sfHolidayStopRequest: HolidayStopRequest): HolidayStopRequestFull = HolidayStopRequestFull(
    id = sfHolidayStopRequest.Id.value,
    start = sfHolidayStopRequest.Start_Date__c.value,
    end = sfHolidayStopRequest.End_Date__c.value,
    subscriptionName = sfHolidayStopRequest.Subscription_Name__c,
    mutabilityFlags = calculateMutabilityFlags(
      ActionCalculator.getProductSpecifics(sfHolidayStopRequest.Product_Name__c).firstAvailableDate,
      sfHolidayStopRequest.Actioned_Count__c.value,
      sfHolidayStopRequest.End_Date__c.value
    ),
    publicationsImpacted = sfHolidayStopRequest.Holiday_Stop_Request_Detail__r.map(_.records.map(detail => HolidayStopRequestsDetail(
      publicationDate = detail.Stopped_Publication_Date__c.value,
      estimatedPrice = detail.Estimated_Price__c.map(_.value),
      actualPrice = detail.Actual_Price__c.map(_.value)
    ))).getOrElse(List())
  )

  def calculateMutabilityFlags(firstAvailableDate: LocalDate, actionedCount: Int, endDate: LocalDate): MutabilityFlags = {
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

case class MutabilityFlags(
  isDeletable: Boolean,
  isEditable: Boolean
)
object MutabilityFlags {
  implicit val writes: OWrites[MutabilityFlags] = Json.writes[MutabilityFlags]
}

case class HolidayStopRequestsDetail(
  publicationDate: LocalDate,
  estimatedPrice: Option[Double],
  actualPrice: Option[Double]
)
object HolidayStopRequestsDetail {
  implicit val writes: OWrites[HolidayStopRequestsDetail] = Json.writes[HolidayStopRequestsDetail]
}

case class HolidayStopRequestPartial(
  start: LocalDate,
  end: LocalDate,
  subscriptionName: SubscriptionName
)
object HolidayStopRequestPartial {
  implicit val reads: Reads[HolidayStopRequestPartial] = Json.reads[HolidayStopRequestPartial]
}

case class HolidayStopRequestFull(
  id: String,
  start: LocalDate,
  end: LocalDate,
  subscriptionName: SubscriptionName,
  mutabilityFlags: MutabilityFlags,
  publicationsImpacted: List[HolidayStopRequestsDetail]
)
object HolidayStopRequestFull {
  implicit val writes: OWrites[HolidayStopRequestFull] = Json.writes[HolidayStopRequestFull]
}

case class GetHolidayStopRequests(
  productSpecifics: Option[ProductSpecifics],
  existing: List[HolidayStopRequestFull]
)
object GetHolidayStopRequests {

  def apply(holidayStopRequests: List[HolidayStopRequest], optionalProductNamePrefix: Option[ProductName]): GetHolidayStopRequests = {
    val optionalProductSpecifics = optionalProductNamePrefix.map(
      productNamePrefix => ActionCalculator.getProductSpecifics(productNamePrefix)
    )
    GetHolidayStopRequests(
      optionalProductSpecifics,
      holidayStopRequests.map(WireHolidayStopRequest.apply)
    )
  }

  implicit val writesProductSpecifics: OWrites[ProductSpecifics] = Json.writes[ProductSpecifics]
  implicit val writes: OWrites[GetHolidayStopRequests] = Json.writes[GetHolidayStopRequests]

}
