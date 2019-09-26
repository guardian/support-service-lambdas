package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holiday_stops.subscription.{CurrentSundayVoucherSubscription, Subscription}
import com.gu.holiday_stops.SundayVoucherHolidayStopConfig
import org.scalatest._

import scala.io.Source
import io.circe.parser.decode
import io.circe.generic.auto._

class SundayVoucherNextBillingPeriodStartDateSpec extends FlatSpec with Matchers with EitherValues {
  "CurrentSundayVoucherSubscription" should "satisfy all the predicates" in {
    val subscriptionRaw = Source.fromResource("SundayVoucherSubscription.json").mkString
    val subscription = decode[Subscription](subscriptionRaw).getOrElse(fail("Could not decode CurrentSundayVoucherSubscription"))
    val currentSundayVoucherSubscription = CurrentSundayVoucherSubscription(subscription, SundayVoucherHolidayStopConfig.Dev.productRatePlanChargeId).right.value
    SundayVoucherNextBillingPeriodStartDate(currentSundayVoucherSubscription) should be(LocalDate.of(2019, 11, 6))
  }
}
