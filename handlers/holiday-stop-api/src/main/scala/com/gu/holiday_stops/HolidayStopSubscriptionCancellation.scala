package com.gu.holiday_stops

import java.time.LocalDate

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.HolidayStopRequest
import com.gu.salesforce.holiday_stops.{SalesforceHolidayStopRequest, SalesforceHolidayStopRequestsDetail}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{HolidayStopRequestsDetailChargeCode, HolidayStopRequestsDetailChargePrice, SubscriptionName}

final case class HolidayStopSubscriptionCancellationError(reason: String)

object HolidayStopSubscriptionCancellation {
  def apply(
    cancellationDate: LocalDate,
    holidayStopRequests: List[HolidayStopRequest]
  ): List[SalesforceHolidayStopRequestsDetail.HolidayStopRequestsDetail] = {
    val allHolidayStopRequestDetails: List[SalesforceHolidayStopRequestsDetail.HolidayStopRequestsDetail] =
      holidayStopRequests
        .flatMap { holidayStopRequest =>
          holidayStopRequest
            .Holiday_Stop_Request_Detail__r
            .map(_.records)
            .getOrElse(Nil)
        }

    allHolidayStopRequestDetails
      .collect {
        case requestDetail: SalesforceHolidayStopRequestsDetail.HolidayStopRequestsDetail if requestDetail.Charge_Code__c == None
          && (requestDetail.Stopped_Publication_Date__c.value.isBefore(cancellationDate)
            || requestDetail.Stopped_Publication_Date__c.value.isEqual(cancellationDate)) =>
          requestDetail.copy(
            Charge_Code__c = Some(HolidayStopRequestsDetailChargeCode("ManualRefund_Cancellation")),
            Actual_Price__c = requestDetail.Estimated_Price__c
          )
      }
  }
}
