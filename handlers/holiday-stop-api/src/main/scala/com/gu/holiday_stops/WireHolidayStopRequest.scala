package com.gu.holiday_stops

import java.time.LocalDate

import cats.implicits._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{ProductName, ProductRatePlanKey, SubscriptionName}
import play.api.libs.json.{Json, OFormat}

object WireHolidayStopRequest {

  def apply(sfHolidayStopRequest: HolidayStopRequest): HolidayStopRequestFull = HolidayStopRequestFull(
    id = sfHolidayStopRequest.Id.value,
    start = sfHolidayStopRequest.Start_Date__c.value,
    end = sfHolidayStopRequest.End_Date__c.value,
    subscriptionName = sfHolidayStopRequest.Subscription_Name__c,
    publicationsImpacted = sfHolidayStopRequest.Holiday_Stop_Request_Detail__r.map(_.records.map(detail => HolidayStopRequestsDetail(
      publicationDate = detail.Stopped_Publication_Date__c.value
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
  implicit val format: OFormat[MutabilityFlags] = Json.format[MutabilityFlags]
}


case class HolidayStopRequestsDetail(
  publicationDate: LocalDate,
  // TODO add other fields
)

object HolidayStopRequestsDetail {
  implicit val format: OFormat[HolidayStopRequestsDetail] = Json.format[HolidayStopRequestsDetail]
}

case class HolidayStopRequestPartial(
  start: LocalDate,
  end: LocalDate,
  subscriptionName: SubscriptionName
)

object HolidayStopRequestPartial {
  implicit val format: OFormat[HolidayStopRequestPartial] = Json.format[HolidayStopRequestPartial]
}

case class HolidayStopRequestFull(
  id: String,
  start: LocalDate,
  end: LocalDate,
  subscriptionName: SubscriptionName,
  publicationsImpacted: List[HolidayStopRequestsDetail]
)

object HolidayStopRequestFull {
  implicit val format: OFormat[HolidayStopRequestFull] = Json.format[HolidayStopRequestFull]
}

case class GetHolidayStopRequests(
  productSpecifics: Option[ProductSpecifics],
  existing: List[HolidayStopRequestFull],
  productRatePlanChargeSpecifics: List[ProductSpecifics]
)

object GetHolidayStopRequests {

  def apply(holidayStopRequests: List[HolidayStopRequest],
            optionalProductNamePrefix: Option[ProductName],
            optionalProductRatePlanKey: Option[ProductRatePlanKey]): Either[GetHolidayStopRequestsError, GetHolidayStopRequests] = {
    for {
      optionalProductSpecificForProductPrefix <- optionalProductNamePrefix.map(
        productNamePrefix => ActionCalculator.getProductSpecifics(productNamePrefix)
      ).asRight[GetHolidayStopRequestsError]

      optionalProductSpecificForProductNameRatePlanName <- optionalProductRatePlanKey.traverse(
        productRatePlanKey =>
          ActionCalculator
            .getProductSpecificsByProductRatePlanKey(productRatePlanKey)
            .leftMap(error => GetHolidayStopRequestsError(s"Failed to get product specifics for $productRatePlanKey: $error"))
      )
    } yield GetHolidayStopRequests(
      optionalProductSpecificForProductPrefix,
      holidayStopRequests.map(WireHolidayStopRequest.apply),
      optionalProductSpecificForProductNameRatePlanName.getOrElse(Nil)
    )
  }

  implicit val writesProductSpecifics: OFormat[ProductSpecifics] = Json.format[ProductSpecifics]
  implicit val writes: OFormat[GetHolidayStopRequests] = Json.format[GetHolidayStopRequests]
}

case class GetHolidayStopRequestsError(message: String)