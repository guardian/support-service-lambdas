package com.gu.holidaystopprocessor

import java.time.LocalDate

import org.scalacheck.Prop.forAll
import org.scalacheck._
import org.scalatest.OptionValues

object HolidayCreditSpec extends Properties("HolidayCreditAmount") with OptionValues {

  private val ratePlanChargeGen = for {
    price <- Gen.choose(0.01, 10000)
    billingPeriod <- Gen.oneOf(List("Month", "Quarter", "Annual"))
  } yield RatePlanCharge(
    name = "GW",
    number = "C5",
    price,
    Some(billingPeriod),
    effectiveStartDate = LocalDate.of(2019, 7, 10),
    chargedThroughDate = Some(LocalDate.of(2020, 1, 1)),
    HolidayStart__c = None,
    HolidayEnd__c = None
  )

  val subscription = Fixtures.mkSubscription()

  property("should never be positive") = forAll(ratePlanChargeGen) { charge: RatePlanCharge =>
    val ratePlans = List(RatePlan("", List(charge)))
    HolidayCredit(subscription.copy(ratePlans = ratePlans)) <= 0
  }

  property("should never be overwhelmingly negative") = forAll(ratePlanChargeGen) { charge: RatePlanCharge =>
    val ratePlans = List(RatePlan("", List(charge)))
    HolidayCredit(subscription.copy(ratePlans = ratePlans)) > -charge.price
  }
}
