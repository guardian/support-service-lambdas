package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import io.circe.generic.auto._
import io.circe.parser.decode
import org.scalatest._
import scala.io.Source

class StoppedPublicationDateOutsideInvoiceSpec extends FlatSpec with Matchers with EitherValues {
  private val processedThroughDate = LocalDate.parse("2019-07-05")
  private val chargedThroughDate = LocalDate.parse("2019-10-05")

  "StoppedPublication construction" should "succeed if stoppedPublicationDate is equal to or after current invoiced period start date" in {
    val subscriptionRaw = Source.fromResource("StoppedPublicationDateOutsideInvoice.json").mkString
    val subscription = decode[Subscription](subscriptionRaw).getOrElse(fail("Could not decode GuardianWeeklySubscription"))
    val guardianWeeklySub = GuardianWeeklySubscription(subscription, StoppedPublicationDate(LocalDate.parse("2019-10-11")))
    guardianWeeklySub.right.value.credit should be(HolidayStopCredit(amount = -6.16, invoiceDate = chargedThroughDate))
  }

  it should "fail if stoppedPublicationDate is before current invoiced period start date" in {
    val subscriptionRaw = Source.fromResource("StoppedPublicationDateOutsideInvoice.json").mkString
    val subscription = decode[Subscription](subscriptionRaw).getOrElse(fail("Could not decode GuardianWeeklySubscription"))
    val guardianWeeklySub = GuardianWeeklySubscription(subscription, StoppedPublicationDate(processedThroughDate.minusDays(1)))
    guardianWeeklySub.isLeft should be(true)
  }
}
