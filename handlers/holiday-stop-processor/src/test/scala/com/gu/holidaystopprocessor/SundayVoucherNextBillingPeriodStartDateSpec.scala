package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holiday_stops.subscription.{MutableCalendar, StoppedProduct, Subscription}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import org.scalatest._

import scala.io.Source
import io.circe.parser.decode
import io.circe.generic.auto._

class SundayVoucherNextBillingPeriodStartDateSpec extends FlatSpec with Matchers with EitherValues with Inside {
  MutableCalendar.setFakeToday(Some(LocalDate.parse("2019-02-01")))

  "CurrentSundayVoucherSubscription" should "satisfy all the predicates" in {
    val subscriptionRaw = Source.fromResource("SundayVoucherSubscription.json").mkString
    val subscription = decode[Subscription](subscriptionRaw).getOrElse(fail("Could not decode CurrentSundayVoucherSubscription"))
    val holidayCredit = StoppedProduct(subscription, StoppedPublicationDate(LocalDate.parse("2019-10-27"))).right.value
    holidayCredit.invoiceDate should be(LocalDate.of(2019, 11, 6))
  }
}
