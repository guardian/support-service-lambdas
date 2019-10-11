package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.Fixtures
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import org.scalactic.TypeCheckedTripleEquals
import org.scalatest._

class StoppedPublicationDateOutsideInvoiceSpec extends FlatSpec with Matchers with EitherValues with TypeCheckedTripleEquals {

  MutableCalendar.setFakeToday(Some(LocalDate.parse("2019-08-01")))

  private val processedThroughDate = LocalDate.parse("2019-07-05")
  private val chargedThroughDate = LocalDate.parse("2019-10-05")

  "StoppedPublication construction" should "succeed if stoppedPublicationDate is equal to or after current invoiced period start date" in {
    val subscription = Fixtures.subscriptionFromJson("StoppedPublicationDateOutsideInvoice.json")
    val guardianWeeklySub = GuardianWeeklySubscription(subscription, StoppedPublicationDate(LocalDate.parse("2019-10-11")))
    guardianWeeklySub.right.value.credit should ===(HolidayStopCredit(amount = -6.16, invoiceDate = chargedThroughDate.plusMonths(3)))
  }

  it should "fail if stoppedPublicationDate is before current invoiced period start date" in {
    val subscription = Fixtures.subscriptionFromJson("StoppedPublicationDateOutsideInvoice.json")
    val guardianWeeklySub = GuardianWeeklySubscription(subscription, StoppedPublicationDate(processedThroughDate.minusDays(1)))
    guardianWeeklySub.isLeft should ===(true)
  }
}
