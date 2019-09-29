package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import io.circe.generic.auto._
import io.circe.parser.decode
import org.scalatest._

import scala.io.Source

class CurrentSundayVoucherSubscriptionSpec extends FlatSpec with Matchers with EitherValues {
  "CurrentSundayVoucherSubscription" should "satisfy all the predicates" in {
    val subscriptionRaw = Source.fromResource("SundayVoucherSubscription.json").mkString
    val subscription = decode[Subscription](subscriptionRaw).getOrElse(fail("Could not decode CurrentSundayVoucherSubscription"))
    val currentSundayVoucherSubscription = VoucherSubscription(subscription, StoppedPublicationDate(LocalDate.parse("2019-10-27")))
    currentSundayVoucherSubscription.right.value.dayOfWeek should be(VoucherDayOfWeek.Sunday)
  }

  it should "fail on missing invoice" in {
    val subscriptionRaw = Source.fromResource("SundayVoucherSubscriptionMissingInvoice.json").mkString
    val subscription = decode[Subscription](subscriptionRaw).getOrElse(fail("Could not decode CurrentSundayVoucherSubscription"))
    val currentSundayVoucherSubscription = VoucherSubscription(subscription, StoppedPublicationDate(LocalDate.parse("2019-10-27")))
    currentSundayVoucherSubscription.isLeft should be(true)
  }
}
