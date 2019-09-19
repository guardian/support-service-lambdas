package com.gu.holiday_stops

import java.time.LocalDate

import org.scalacheck.Prop.forAll
import org.scalacheck._
import org.scalatest.{EitherValues, OptionValues}

object HolidayCreditSpec extends Properties("HolidayCreditAmount") with OptionValues with EitherValues {

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
    val ratePlans = List(RatePlan("", List(charge), GuardianWeeklyHolidayStopConfig.Prod.productRatePlanIds.head, ""))
    val currentGuardianWeeklySubscription = CurrentGuardianWeeklySubscription(subscription.copy(ratePlans = ratePlans), Fixtures.guardianWeeklyConfig.productRatePlanIds, Nil)
    GuardianWeeklyHolidayCredit(currentGuardianWeeklySubscription.right.value, LocalDate.now) < 0
  }

  property("should never be overwhelmingly negative") = forAll(ratePlanChargeGen) { charge: RatePlanCharge =>
    val ratePlans = List(RatePlan("", List(charge), GuardianWeeklyHolidayStopConfig.Prod.productRatePlanIds.head, ""))
    val currentGuardianWeeklySubscription = CurrentGuardianWeeklySubscription(subscription.copy(ratePlans = ratePlans), Fixtures.guardianWeeklyConfig.productRatePlanIds, Nil)
    GuardianWeeklyHolidayCredit(currentGuardianWeeklySubscription.right.value, LocalDate.now) > -charge.price
  }
}
