package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import io.circe.generic.auto._
import io.circe.parser.decode
import org.scalatest._

import scala.io.Source

class CurrentWeekendVoucherSubscriptionSpec extends FlatSpec with Matchers with EitherValues {
  "CurrentWeekendVoucherSubscription" should "satisfy all the predicates" in {
    val subscriptionRaw = Source.fromResource("WeekendVoucherSubscription.json").mkString
    val subscription = decode[Subscription](subscriptionRaw).getOrElse(fail("Could not decode CurrentWeekendVoucherSubscription"))
    val model = VoucherSubscription(subscription, StoppedPublicationDate(LocalDate.parse("2019-10-26"))).right.value
    model.dayOfWeek should be(VoucherDayOfWeek.Saturday)
    model.price should be(10.56)
  }

  it should "fail if stoppedPublicationDate falls outside invoiced period" in {
    val subscriptionRaw = Source.fromResource("WeekendVoucherSubscription.json").mkString
    val subscription = decode[Subscription](subscriptionRaw).getOrElse(fail("Could not decode CurrentWeekendVoucherSubscription"))
    val model = VoucherSubscription(subscription, StoppedPublicationDate(LocalDate.parse("2019-09-01")))
    model.isLeft should be(true)
  }

  it should "fail if stoppedPublicationDate falls outside weekend" in {
    val subscriptionRaw = Source.fromResource("WeekendVoucherSubscription.json").mkString
    val subscription = decode[Subscription](subscriptionRaw).getOrElse(fail("Could not decode CurrentWeekendVoucherSubscription"))
    val model = VoucherSubscription(subscription, StoppedPublicationDate(LocalDate.parse("2019-10-28")))
    model.isLeft should be(true)
  }
}
