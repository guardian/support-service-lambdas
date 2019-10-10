package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.{Fixtures, ZuoraHolidayError}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import org.scalactic.TypeCheckedTripleEquals
import org.scalatest._

class StoppedPublicationDateOutsideInvoiceSpec extends FlatSpec with Matchers with EitherValues with TypeCheckedTripleEquals {
  private val processedThroughDate = LocalDate.parse("2019-07-05")
  private val chargedThroughDate = LocalDate.parse("2019-10-05")

  "StoppedPublication construction" should "fail if sub has no relevant unexpired rate plan" in {
    val subscription = Fixtures.subscriptionFromJson("StoppedPublicationDateOutsideInvoice.json")
    val guardianWeeklySub = GuardianWeeklySubscription(subscription, StoppedPublicationDate(LocalDate.parse("2019-10-11")))
    guardianWeeklySub.isLeft should ===(true)
  }

  it should "fail if stoppedPublicationDate is before current invoiced period start date" in {
    val subscription = Fixtures.subscriptionFromJson("StoppedPublicationDateOutsideInvoice.json")
    val guardianWeeklySub = GuardianWeeklySubscription(subscription, StoppedPublicationDate(processedThroughDate.minusDays(1)))
    guardianWeeklySub.isLeft should ===(true)
  }
}
