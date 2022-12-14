package com.gu.holiday_stops

import java.time.LocalDate

import com.gu.zuora.subscription.{Price, RatePlanChargeCode}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class HolidayStopSubscriptionCancellationTest extends AnyFlatSpec with Matchers {
  val estimatedPrice = 1.23

  val cancellationDate = LocalDate.now()
  val dateBeforeCancellation = cancellationDate.minusDays(1)
  val dateAfterCancellation = cancellationDate.plusDays(1)

  "HolidayStopSubscriptionCancellationTest" should "return unprocessed holiday stops before cancellation date" in {

    val unprocessedStopForDateBeforeCancellation =
      testDetail(dateBeforeCancellation, None, estimatedPrice, Some(cancellationDate))
    val unprocessedStopForDateOnCancellation =
      testDetail(cancellationDate, None, estimatedPrice, Some(cancellationDate))
    val unprocessedStopForDateAfterCancellation =
      testDetail(dateAfterCancellation, None, estimatedPrice, Some(cancellationDate))

    val holidayStopRequests = List(
      Fixtures.mkHolidayStopRequest(
        "id",
        requestDetail = List(
          unprocessedStopForDateBeforeCancellation,
          unprocessedStopForDateOnCancellation,
          unprocessedStopForDateAfterCancellation,
        ),
      ),
    )

    HolidayStopSubscriptionCancellation(cancellationDate, holidayStopRequests) should contain only (
      unprocessedStopForDateBeforeCancellation.copy(
        Actual_Price__c = Some(Price(estimatedPrice)),
        Charge_Code__c = Some(RatePlanChargeCode("ManualRefund_Cancellation")),
      )
    )
  }
  it should "return processed holiday stops with refund date after cancellation date" in {

    val processedExpectedRefundedBeforeCancellationDate = testDetail(
      dateBeforeCancellation,
      Some("ChargeCode-1111"),
      estimatedPrice,
      estimatedInvoiceDate = Some(dateBeforeCancellation),
    )
    val processedExpectedRefundedOnCancellationDate = testDetail(
      dateBeforeCancellation,
      Some("ChargeCode-1111"),
      estimatedPrice,
      estimatedInvoiceDate = Some(cancellationDate),
    )
    val processedExpectedRefundedAfterCancellationDate = testDetail(
      dateBeforeCancellation,
      Some("ChargeCode-1111"),
      estimatedPrice,
      estimatedInvoiceDate = Some(dateAfterCancellation),
    )
    val processedMissingExpectedRefundedDate = testDetail(
      dateBeforeCancellation,
      Some("ChargeCode-1111"),
      estimatedPrice,
      estimatedInvoiceDate = None,
    )
    val holidayStopRequests = List(
      Fixtures.mkHolidayStopRequest(
        "id",
        requestDetail = List(
          processedMissingExpectedRefundedDate,
          processedExpectedRefundedBeforeCancellationDate,
          processedExpectedRefundedOnCancellationDate,
          processedExpectedRefundedAfterCancellationDate,
        ),
      ),
    )

    HolidayStopSubscriptionCancellation(cancellationDate, holidayStopRequests) should contain only (
      processedExpectedRefundedOnCancellationDate.copy(
        Actual_Price__c = Some(Price(estimatedPrice)),
      ),
      processedExpectedRefundedAfterCancellationDate.copy(
        Actual_Price__c = Some(Price(estimatedPrice)),
      )
    )
  }

  private def testDetail(
      stopDate: LocalDate,
      chargeCode: Option[String],
      estimatedPrice: Double,
      estimatedInvoiceDate: Option[LocalDate],
  ) = {
    Fixtures.mkHolidayStopRequestDetails(
      estimatedPrice = Some(estimatedPrice),
      actualPrice = None,
      chargeCode = chargeCode,
      stopDate = stopDate,
      expectedInvoiceDate = estimatedInvoiceDate,
    )
  }
}
