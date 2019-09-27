package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.{Fixtures, GuardianWeeklyHolidayStopConfig}
import org.scalacheck.Prop.forAll
import org.scalacheck.{Gen, Properties}
import org.scalatest.{EitherValues, OptionValues}

object GuardianWeeklyHolidayCreditSpec extends Properties("HolidayCreditAmount") with OptionValues with EitherValues {

  private val ratePlanChargeGen = for {
    price <- Gen.choose(0.01, 10000)
    billingPeriod <- Gen.oneOf(List("Quarter", "Annual"))
    chargedThroughDate = Some(LocalDate.of(2020, 1, 1))
  } yield RatePlanCharge(
    name = "GW",
    number = "C5",
    price,
    Some(billingPeriod),
    effectiveStartDate = LocalDate.of(2019, 7, 10),
    chargedThroughDate = chargedThroughDate,
    HolidayStart__c = None,
    HolidayEnd__c = None,
    processedThroughDate = chargedThroughDate.map(_.minusMonths(Fixtures.billingPeriodToMonths(billingPeriod))),
    productRatePlanChargeId = ""
  )

  val subscription = Fixtures.mkSubscription()

  property("should be negative") = forAll(ratePlanChargeGen) { charge: RatePlanCharge =>
    val ratePlans = List(RatePlan("", List(charge), GuardianWeeklyHolidayStopConfig.Dev.productRatePlanIds.head, ""))
    val currentGuardianWeeklySubscription = CurrentGuardianWeeklySubscription(subscription.copy(ratePlans = ratePlans), Fixtures.config)
    GuardianWeeklyHolidayCredit(currentGuardianWeeklySubscription.right.value, LocalDate.now) < 0
  }

  property("should never be overwhelmingly negative") = forAll(ratePlanChargeGen) { charge: RatePlanCharge =>
    val ratePlans = List(RatePlan("", List(charge), GuardianWeeklyHolidayStopConfig.Dev.productRatePlanIds.head, ""))
    val currentGuardianWeeklySubscription = CurrentGuardianWeeklySubscription(subscription.copy(ratePlans = ratePlans), Fixtures.config)
    GuardianWeeklyHolidayCredit(currentGuardianWeeklySubscription.right.value, LocalDate.now) > -charge.price
  }
}
