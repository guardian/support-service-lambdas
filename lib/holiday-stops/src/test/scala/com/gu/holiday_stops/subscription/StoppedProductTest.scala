package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.Fixtures
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import org.scalactic.TypeCheckedTripleEquals
import org.scalatest.{Assertion, EitherValues, FlatSpec, Matchers}

class StoppedProductTest extends FlatSpec with Matchers with TypeCheckedTripleEquals with EitherValues {

  private def testInvoiceDate(
    resource: String,
    stoppedPublicationDate: String,
    expectedInvoiceDate: String
  ): Assertion = {
    val subscription = Fixtures.subscriptionFromJson(resource)
    val stoppedDate = StoppedPublicationDate(LocalDate.parse(stoppedPublicationDate))
    val stoppedProduct = StoppedProduct(subscription, stoppedDate).right.value
    stoppedProduct.credit.invoiceDate should ===(LocalDate.parse(expectedInvoiceDate))
  }

  "credit.invoiceDate" should "be first day of billing period after 1 June 2020" in {
    testInvoiceDate(
      resource = "GuardianWeeklyWith6For6.json",
      stoppedPublicationDate = "2020-06-05",
      expectedInvoiceDate = "2020-08-15"
    )
    testInvoiceDate(
      resource = "StoppedPublicationDateOutsideInvoice.json",
      stoppedPublicationDate = "2020-06-05",
      expectedInvoiceDate = "2020-07-05"
    )
    testInvoiceDate(
      resource = "SundayVoucherSubscription.json",
      stoppedPublicationDate = "2020-06-07",
      expectedInvoiceDate = "2020-07-06"
    )
    testInvoiceDate(
      resource = "WeekendVoucherSubscription.json",
      stoppedPublicationDate = "2020-06-06",
      expectedInvoiceDate = "2020-06-26"
    )
  }

  it should "be first day of current billing period when stopped publication date is first day of a billing period" in {
    testInvoiceDate(
      resource = "GuardianWeeklyWith6For6.json",
      stoppedPublicationDate = "2020-05-15",
      expectedInvoiceDate = "2020-08-15"
    )
  }

  it should "be first day of next billing period when stopped publication date is last day of a billing period" in {
    testInvoiceDate(
      resource = "GuardianWeeklyWith6For6.json",
      stoppedPublicationDate = "2020-08-14",
      expectedInvoiceDate = "2020-08-15"
    )
  }
}
