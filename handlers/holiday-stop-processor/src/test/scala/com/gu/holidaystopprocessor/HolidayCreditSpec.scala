package com.gu.holidaystopprocessor

import java.time.LocalDate

import org.scalacheck.Prop.forAll
import org.scalacheck._
import org.scalatest.OptionValues

object HolidayCreditSpec extends Properties("HolidayCredit") with OptionValues {

  private val ratePlanChargeGen = for {
    price <- Gen.choose(0.01, 10000)
    billingPeriod <- Gen.oneOf(Seq("Month", "Quarter", "Annual"))
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

  property("should never be positive") = forAll(ratePlanChargeGen) { charge: RatePlanCharge =>
    HolidayCredit(charge) <= 0
  }

  property("should never be overwhelmingly negative") = forAll(ratePlanChargeGen) { charge: RatePlanCharge =>
    HolidayCredit(charge) > -charge.price
  }
}
