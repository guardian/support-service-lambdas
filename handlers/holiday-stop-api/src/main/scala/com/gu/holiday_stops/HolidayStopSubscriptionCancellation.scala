package com.gu.holiday_stops

import java.time.LocalDate

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.HolidayStopRequest
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail
import com.gu.zuora.subscription.RatePlanChargeCode

final case class HolidayStopSubscriptionCancellationError(reason: String)

object HolidayStopSubscriptionCancellation {
  def apply(
      cancellationDate: LocalDate,
      holidayStopRequests: List[HolidayStopRequest],
      autoRefundGuid: Option[String] = None,
  ): List[SalesforceHolidayStopRequestsDetail.HolidayStopRequestsDetail] = {
    val allHolidayStopRequestDetails: List[SalesforceHolidayStopRequestsDetail.HolidayStopRequestsDetail] =
      holidayStopRequests
        .flatMap { holidayStopRequest =>
          holidayStopRequest.Holiday_Stop_Request_Detail__r
            .map(_.records)
            .getOrElse(Nil)
        }

    allHolidayStopRequestDetails
      .collect {
        case requestDetail
            if holidayStopShouldBeManuallyRefunded(
              requestDetail,
              cancellationDate,
            ) =>
          val chargeCode = requestDetail.Charge_Code__c
            .getOrElse(RatePlanChargeCode(autoRefundGuid.getOrElse("ManualRefund_Cancellation")))
          requestDetail.copy(
            Charge_Code__c = Some(chargeCode),
            Actual_Price__c = requestDetail.Estimated_Price__c,
          )
      }
  }

  private def holidayStopShouldBeManuallyRefunded(
      holidayStop: SalesforceHolidayStopRequestsDetail.HolidayStopRequestsDetail,
      cancellationDate: LocalDate,
  ) = {
    val stopDateIsBeforeCancellationDate = holidayStop.Stopped_Publication_Date__c.value.isBefore(cancellationDate)

    val stopHasBeenProcessed = holidayStop.Charge_Code__c.isDefined

    val stopHasNotBeenProcessed = !stopHasBeenProcessed

    val stopRefundInvoiceDateIsAfterOrEqualToCancellationDate =
      holidayStop.Expected_Invoice_Date__c.exists(invoiceDate => !invoiceDate.value.isBefore(cancellationDate))

    stopDateIsBeforeCancellationDate && (
      stopHasNotBeenProcessed ||
        (stopHasBeenProcessed && stopRefundInvoiceDateIsAfterOrEqualToCancellationDate)
    )
  }
}
