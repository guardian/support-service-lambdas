package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holiday_stops.subscription.Subscription
import com.gu.holiday_stops.Fixtures
import org.scalatest._

import scala.io.Source
import io.circe.parser.decode
import io.circe.generic.auto._

class SundayVoucherNextBillingPeriodStartDateSpec extends FlatSpec with Matchers with EitherValues {
  "CurrentSundayVoucherSubscription" should "satisfy all the predicates" in {
    val subscriptionRaw = Source.fromResource("SundayVoucherSubscription.json").mkString
    val subscription = decode[Subscription](subscriptionRaw).getOrElse(fail("Could not decode CurrentSundayVoucherSubscription"))
    NextBillingPeriodStartDate(Fixtures.config, subscription, LocalDate.now).right.value should be(LocalDate.of(2019, 11, 6))
  }
}
