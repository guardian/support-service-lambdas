package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holiday_stops.RatePlanCharge
import org.scalatest.{FlatSpec, Matchers, OptionValues}

class SubscriptionTest extends FlatSpec with Matchers with OptionValues {

  "ratePlanCharge" should "give ratePlanCharge corresponding to holiday stop" in {
    val subscription = Fixtures.mkSubscriptionWithHolidayStops()
    val stop = Fixtures.mkHolidayStop(LocalDate.of(2019, 8, 9))
    subscription.ratePlanCharge(stop).value shouldBe RatePlanCharge(
      name = "Holiday Credit",
      number = "C2",
      price = -3.27,
      billingPeriod = None,
      effectiveStartDate = LocalDate.of(2019, 9, 7),
      chargedThroughDate = None,
      HolidayStart__c = Some(LocalDate.of(2019, 8, 9)),
      HolidayEnd__c = Some(LocalDate.of(2019, 8, 9)),
      processedThroughDate = None
    )
  }

  it should "give another ratePlanCharge corresponding to another holiday stop" in {
    val subscription = Fixtures.mkSubscriptionWithHolidayStops()
    val stop = Fixtures.mkHolidayStop(LocalDate.of(2019, 8, 2))
    subscription.ratePlanCharge(stop).value shouldBe RatePlanCharge(
      name = "Holiday Credit",
      number = "C3",
      price = -5.81,
      billingPeriod = None,
      effectiveStartDate = LocalDate.of(2019, 9, 7),
      chargedThroughDate = None,
      HolidayStart__c = Some(LocalDate.of(2019, 8, 2)),
      HolidayEnd__c = Some(LocalDate.of(2019, 8, 2)),
      processedThroughDate = None
    )
  }

  it should "give no ratePlanCharge when none correspond to holiday stop" in {
    val subscription = Fixtures.mkSubscriptionWithHolidayStops()
    val stop = Fixtures.mkHolidayStop(LocalDate.of(2019, 8, 23))
    subscription.ratePlanCharge(stop) shouldBe None
  }

  it should "give no ratePlanCharge when subscription has no holiday stops applied" in {
    val subscription = Fixtures.mkSubscription(
      termStartDate = LocalDate.of(2018, 1, 1),
      termEndDate = LocalDate.of(2019, 1, 1),
      price = 123,
      billingPeriod = "Quarter",
      chargedThroughDate = None
    )
    val stop = Fixtures.mkHolidayStop(LocalDate.of(2019, 8, 23))
    subscription.ratePlanCharge(stop) shouldBe None
  }

  it should "give no RatePlanCharge when dates correspond but it's not for a holiday credit" in {
    val subscription = Fixtures.mkSubscriptionWithHolidayStops()
    val stop = Fixtures.mkHolidayStop(LocalDate.of(2019, 8, 19))
    subscription.ratePlanCharge(stop) shouldBe None
  }

  it should "give no RatePlanCharge when dates correspond but it's not for a discount plan" in {
    val subscription = Fixtures.mkSubscriptionWithHolidayStops()
    val stop = Fixtures.mkHolidayStop(LocalDate.of(2019, 8, 11))
    subscription.ratePlanCharge(stop) shouldBe None
  }

  it should "give RatePlanCharge when dates overlap but don't match precisely" in {
    val subscription = Fixtures.mkSubscriptionWithHolidayStops()
    val stop = Fixtures.mkHolidayStop(LocalDate.of(2018, 12, 22))
    subscription.ratePlanCharge(stop).value shouldBe RatePlanCharge(
      name = "Holiday Credit",
      number = "C987",
      price = -4.92,
      billingPeriod = None,
      effectiveStartDate = LocalDate.of(2018, 11, 16),
      chargedThroughDate = None,
      HolidayStart__c = Some(LocalDate.of(2018, 11, 16)),
      HolidayEnd__c = Some(LocalDate.of(2019, 1, 4)),
      processedThroughDate = None
    )
  }
}
