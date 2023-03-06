package com.gu.holiday_stops

import java.time.{DayOfWeek, LocalDate, ZonedDateTime}

import cats.syntax.all._
import com.gu.fulfilmentdates.FulfilmentDates
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail
import com.gu.zuora.subscription.{SubscriptionData, SubscriptionName}
import play.api.libs.json._

object WireHolidayStopRequest {

  def apply(firstAvailableDate: LocalDate)(sfHolidayStopRequest: HolidayStopRequest): HolidayStopRequestFull = {
    val publicationsImpacted = sfHolidayStopRequest.Holiday_Stop_Request_Detail__r
      .map(_.records.map(toHolidayStopRequestDetail))
      .getOrElse(List())

    HolidayStopRequestFull(
      id = sfHolidayStopRequest.Id.value,
      startDate = sfHolidayStopRequest.Start_Date__c.value,
      endDate = sfHolidayStopRequest.End_Date__c.value,
      subscriptionName = sfHolidayStopRequest.Subscription_Name__c,
      publicationsImpacted,
      withdrawnTime = sfHolidayStopRequest.Withdrawn_Time__c.map(_.value),
      bulkSuspensionReason = sfHolidayStopRequest.Bulk_Suspension_Reason__c,
      mutabilityFlags = calculateMutabilityFlags(
        isNotWithdrawn = !sfHolidayStopRequest.Is_Withdrawn__c.value,
        firstAvailableDate = firstAvailableDate,
        actionedCount = sfHolidayStopRequest.Actioned_Count__c.value,
        details = publicationsImpacted,
      ),
    )
  }

  def toHolidayStopRequestDetail(detail: SalesforceHolidayStopRequestsDetail.HolidayStopRequestsDetail) = {
    HolidayStopRequestsDetail(
      publicationDate = detail.Stopped_Publication_Date__c.value,
      estimatedPrice = detail.Estimated_Price__c.map(_.value),
      actualPrice = detail.Actual_Price__c.map(_.value),
      invoiceDate = detail.Expected_Invoice_Date__c.map(_.value),
      isActioned = detail.Is_Actioned__c,
    )
  }

  def calculateMutabilityFlags(
      isNotWithdrawn: Boolean,
      firstAvailableDate: LocalDate,
      actionedCount: Int,
      details: List[HolidayStopRequestsDetail],
  ): MutabilityFlags = {
    val publicationsOnOrAfterFirstAvailableDate = details.filterNot(_.publicationDate isBefore firstAvailableDate)
    MutabilityFlags(
      isFullyMutable =
        isNotWithdrawn && actionedCount == 0 && publicationsOnOrAfterFirstAvailableDate.length == details.length,
      isEndDateEditable =
        isNotWithdrawn && publicationsOnOrAfterFirstAvailableDate.nonEmpty && !publicationsOnOrAfterFirstAvailableDate
          .exists(_.isActioned),
    )
  }

}

case class MutabilityFlags(
    isFullyMutable: Boolean,
    isEndDateEditable: Boolean,
)

object MutabilityFlags {
  implicit val format: OFormat[MutabilityFlags] = Json.format[MutabilityFlags]
}

case class HolidayStopRequestsDetail(
    publicationDate: LocalDate,
    estimatedPrice: Option[Double],
    actualPrice: Option[Double],
    invoiceDate: Option[LocalDate],
    isActioned: Boolean,
)

object HolidayStopRequestsDetail {
  implicit val format: OFormat[HolidayStopRequestsDetail] = Json.format[HolidayStopRequestsDetail]
}

trait HolidayStopRequestPartialTrait {
  val startDate: LocalDate
  val endDate: LocalDate
  val subscriptionName: SubscriptionName
  val bulkSuspensionReason: Option[BulkSuspensionReason]
}

case class HolidayStopRequestPartial(
    startDate: LocalDate,
    endDate: LocalDate,
    subscriptionName: SubscriptionName,
) extends HolidayStopRequestPartialTrait {
  val bulkSuspensionReason = None
}

object HolidayStopRequestPartial {
  implicit val reads: Reads[HolidayStopRequestPartial] = Json.reads[HolidayStopRequestPartial]
}

case class BulkHolidayStopRequestPartial(
    startDate: LocalDate,
    endDate: LocalDate,
    subscriptionName: SubscriptionName,
    reason: BulkSuspensionReason,
) extends HolidayStopRequestPartialTrait {
  val bulkSuspensionReason = Some(reason)
}

object BulkHolidayStopRequestPartial {
  implicit val reads: Reads[BulkHolidayStopRequestPartial] = Json.reads[BulkHolidayStopRequestPartial]
}

case class HolidayStopRequestFull(
    id: String,
    startDate: LocalDate,
    endDate: LocalDate,
    subscriptionName: SubscriptionName,
    publicationsImpacted: List[HolidayStopRequestsDetail],
    withdrawnTime: Option[ZonedDateTime],
    bulkSuspensionReason: Option[BulkSuspensionReason],
    mutabilityFlags: MutabilityFlags,
)

object HolidayStopRequestFull {
  implicit val format: OFormat[HolidayStopRequestFull] = Json.format[HolidayStopRequestFull]
}

case class GetHolidayStopRequests(
    existing: List[HolidayStopRequestFull],
    issueSpecifics: List[IssueSpecifics],
    annualIssueLimit: Int,
    firstAvailableDate: LocalDate,
)

object GetHolidayStopRequests {
  def apply(
      holidayStopRequests: List[HolidayStopRequest],
      subscriptionData: SubscriptionData,
      fulfilmentDates: Map[DayOfWeek, FulfilmentDates],
      fulfilmentStartDate: LocalDate,
  ): Either[GetHolidayStopRequestsError, GetHolidayStopRequests] = {
    subscriptionData.editionDaysOfWeek
      .traverse { editionDayOfWeek =>
        createIssueSpecificsForDayOfWeek(fulfilmentDates, editionDayOfWeek, fulfilmentStartDate)
      }
      .map { issueSpecifics =>
        val firstAvailableDate = calculateFirstAvailableDate(issueSpecifics)
        GetHolidayStopRequests(
          existing = holidayStopRequests.map(WireHolidayStopRequest.apply(firstAvailableDate)),
          issueSpecifics = issueSpecifics,
          annualIssueLimit = subscriptionData.subscriptionAnnualIssueLimit,
          firstAvailableDate,
        )
      }
  }

  private def createIssueSpecificsForDayOfWeek(
      fulfilmentDates: Map[DayOfWeek, FulfilmentDates],
      editionDayOfWeek: DayOfWeek,
      fulfilmentStartDate: LocalDate,
  ) = {
    fulfilmentDates
      .get(editionDayOfWeek)
      .toRight(GetHolidayStopRequestsError(s"Could not find fulfilment dates for day $editionDayOfWeek"))
      .map { fulfilmentDatesForDayOfWeek =>
        val firstAvailableDate =
          latestOf(fulfilmentStartDate, fulfilmentDatesForDayOfWeek.holidayStopFirstAvailableDate)
        IssueSpecifics(firstAvailableDate, editionDayOfWeek.getValue)
      }
  }

  private def calculateFirstAvailableDate(issueSpecifics: List[IssueSpecifics]) = {
    issueSpecifics.map(_.firstAvailableDate).min[LocalDate](_ compareTo _)
  }

  private def latestOf(head: LocalDate, tail: LocalDate*) = (head :: tail.toList).max[LocalDate](_ compareTo _)

  implicit val formatIssueSpecifics: OFormat[IssueSpecifics] = Json.format[IssueSpecifics]
  implicit val format: OFormat[GetHolidayStopRequests] = Json.format[GetHolidayStopRequests]
}

case class GetHolidayStopRequestsError(message: String)

case class GetCancellationDetails(publicationsToRefund: List[HolidayStopRequestsDetail])
object GetCancellationDetails {
  implicit val formatGetCancellationDetails = Json.format[GetCancellationDetails]
}
