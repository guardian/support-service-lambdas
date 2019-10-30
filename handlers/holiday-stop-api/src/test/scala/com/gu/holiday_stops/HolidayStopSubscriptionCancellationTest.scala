package com.gu.holiday_stops

import java.time.LocalDate

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{HolidayStopRequestsDetailChargeCode, HolidayStopRequestsDetailChargePrice}
import org.scalatest.{FlatSpec, Matchers}

class HolidayStopSubscriptionCancellationTest extends FlatSpec with Matchers {
  "HolidayStopSubscriptionCancellationTest" should "return unprocessed holiday stops before cancellation" in {
    val estimatedPrice = 1.23

    val cancellationDate = LocalDate.now().plusMonths(1)
    val cancelableDetail1 = testDetail(cancellationDate.minusDays(1), None, estimatedPrice)
    val cancelableDetail2 = testDetail(cancellationDate, None, estimatedPrice)
    val afterCancellationDateDetail = testDetail(cancellationDate.plusDays(1), None, estimatedPrice)
    val allReadyProcessedDetail = testDetail(cancellationDate.minusDays(10), Some("ChargeCode-1111"), estimatedPrice)

    val holidayStopRequests = List(
      Fixtures.mkHolidayStopRequest(
        "id",
        requestDetail = List(
          cancelableDetail1,
          cancelableDetail2,
          afterCancellationDateDetail,
          allReadyProcessedDetail
        )
      )
    )

    val requestsDetails = HolidayStopSubscriptionCancellation(cancellationDate, holidayStopRequests)

    requestsDetails should contain allOf (
      cancelableDetail1.copy(
        Actual_Price__c = Some(HolidayStopRequestsDetailChargePrice(estimatedPrice)),
        Charge_Code__c = Some(HolidayStopRequestsDetailChargeCode("ManualRefund_Cancellation"))
      ),
        cancelableDetail2.copy(
          Actual_Price__c = Some(HolidayStopRequestsDetailChargePrice(estimatedPrice)),
          Charge_Code__c = Some(HolidayStopRequestsDetailChargeCode("ManualRefund_Cancellation"))
        )
    )
  }

  private def testDetail(date: LocalDate, chargeCode: Option[String], estimatedPrice: Double) = {
    val cancelableDetail1 = Fixtures.mkHolidayStopRequestDetails(
      estimatedPrice = Some(estimatedPrice),
      actualPrice = None,
      chargeCode = chargeCode,
      stopDate = date
    )
    cancelableDetail1
  }
}
