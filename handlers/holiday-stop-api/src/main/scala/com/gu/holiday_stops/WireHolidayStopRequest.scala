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
  implicit val format: OFormat[MutabilityFlags] = Json.format[MutabilityFlags]
}

case class HolidayStopRequestsDetail(
  publicationDate: LocalDate,
  estimatedPrice: Option[Double],
  actualPrice: Option[Double]
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

case class IssueSpecifics(firstAvailableDate: LocalDate, issueDayOfWeek: Int)

case class GetHolidayStopRequests(
  productSpecifics: Option[LegacyProductSpecifics],
  existing: List[HolidayStopRequestFull],
  issueSpecifics: List[IssueSpecifics],
  annualIssueLimit: Option[Int]
)

object GetHolidayStopRequests {

  def apply(
    holidayStopRequests: List[HolidayStopRequest],
    optionalProductNamePrefix: Option[ProductName],
    optionalProductRatePlanKey: Option[ProductRatePlanKey]
  ): Either[GetHolidayStopRequestsError, GetHolidayStopRequests] = {
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
      optionalProductSpecificForProductNameRatePlanName.map(_.issueSpecifics).getOrElse(Nil),
      optionalProductSpecificForProductNameRatePlanName.map(_.annualIssueLimit)
    )
  }

  implicit val formatIssueSpecifics: OFormat[IssueSpecifics] = Json.format[IssueSpecifics]
  implicit val formatProductSpecifics: OFormat[ProductSpecifics] = Json.format[ProductSpecifics]
  implicit val formatLegacyProductSpecifics: OFormat[LegacyProductSpecifics] = Json.format[LegacyProductSpecifics]
  implicit val format: OFormat[GetHolidayStopRequests] = Json.format[GetHolidayStopRequests]
}

case class GetHolidayStopRequestsError(message: String)
