package com.gu.holiday_stops

import java.time.LocalDate

import com.gu.holiday_stops.subscription.{GuardianWeeklySubscription, GuardianWeeklyHolidayCredit, RatePlan}
import org.scalatest.{EitherValues, FlatSpec, Matchers}

class HolidayCreditTest extends FlatSpec with Matchers with EitherValues {

  "HolidayCredit" should "be correct for a quarterly billing period" in {
    val charge = Fixtures.mkRatePlanCharge(price = 30, billingPeriod = "Quarter")
    val ratePlans = List(RatePlan("", List(charge), Fixtures.guardianWeeklyConfig.productRatePlanIds.head, ""))
    val subscription = Fixtures.mkSubscription().copy(ratePlans = ratePlans)
    val currentGuardianWeeklySubscription = GuardianWeeklySubscription(subscription, Fixtures.config)
    val credit = GuardianWeeklyHolidayCredit(currentGuardianWeeklySubscription.right.value, LocalDate.now)
    credit shouldBe -2.31
  }

  it should "be correct for another quarterly billing period" in {
    val charge = Fixtures.mkRatePlanCharge(price = 37.5, billingPeriod = "Quarter")
    val ratePlans = List(RatePlan("", List(charge), Fixtures.guardianWeeklyConfig.productRatePlanIds.head, ""))
    val subscription = Fixtures.mkSubscription().copy(ratePlans = ratePlans)
    val currentGuardianWeeklySubscription = GuardianWeeklySubscription(subscription, Fixtures.config)
    val credit = GuardianWeeklyHolidayCredit(currentGuardianWeeklySubscription.right.value, LocalDate.now)
    credit shouldBe -2.89
  }

  it should "be correct for an annual billing period" in {
    val charge = Fixtures.mkRatePlanCharge(price = 120, billingPeriod = "Annual")
    val ratePlans = List(RatePlan("", List(charge), Fixtures.guardianWeeklyConfig.productRatePlanIds.head, ""))
    val subscription = Fixtures.mkSubscription().copy(ratePlans = ratePlans)
    val currentGuardianWeeklySubscription = GuardianWeeklySubscription(subscription, Fixtures.config)
    val credit = GuardianWeeklyHolidayCredit(currentGuardianWeeklySubscription.right.value, LocalDate.now)
    credit shouldBe -2.31
  }
}
