package com.gu.holiday_stops.subscription

import com.gu.holiday_stops.{Fixtures, SundayVoucherHolidayStopConfig}
import io.circe.generic.auto._
import io.circe.parser.decode
import org.scalatest._

import scala.io.Source

class CurrentSundayVoucherSubscriptionSpec extends FlatSpec with Matchers with EitherValues {
  "CurrentSundayVoucherSubscription" should "satisfy all the predicates" in {
    val subscriptionRaw = Source.fromResource("SundayVoucherSubscription.json").mkString
    val subscription = decode[Subscription](subscriptionRaw).getOrElse(fail("Could not decode CurrentSundayVoucherSubscription"))
    val currentSundayVoucherSubscription = CurrentSundayVoucherSubscription(subscription, Fixtures.config)
    currentSundayVoucherSubscription.right.value.productRatePlanChargeId should be("2c92c0f95aff3b56015b1045fba832d4")
  }

  it should "fail on missing invoice" in {
    val subscriptionRaw = Source.fromResource("SundayVoucherSubscriptionMissingInvoice.json").mkString
    val subscription = decode[Subscription](subscriptionRaw).getOrElse(fail("Could not decode CurrentSundayVoucherSubscription"))
    val currentSundayVoucherSubscription = CurrentSundayVoucherSubscription(subscription, Fixtures.config)
    currentSundayVoucherSubscription.isLeft should be(true)
  }
}
