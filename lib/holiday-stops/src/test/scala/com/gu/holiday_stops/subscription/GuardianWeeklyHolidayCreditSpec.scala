package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.Fixtures
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import org.scalacheck.Prop.forAll
import org.scalacheck.{Gen, Properties}
import org.scalatest.{EitherValues, OptionValues}

object GuardianWeeklyHolidayCreditSpec extends Properties("HolidayCreditAmount") with OptionValues with EitherValues {
  val chargedThroughDate = LocalDate.of(2020, 1, 1)
  private val ratePlanChargeGen = for {
    price <- Gen.choose(0.01, 10000)
    billingPeriod <- Gen.oneOf(List("Quarter", "Annual"))

  } yield RatePlanCharge(
    name = "GW",
    number = "C5",
    price,
    Some(billingPeriod),
    effectiveStartDate = LocalDate.of(2019, 7, 10),
    chargedThroughDate = Some(chargedThroughDate),
    HolidayStart__c = None,
    HolidayEnd__c = None,
    processedThroughDate = Some(chargedThroughDate.minusMonths(Fixtures.billingPeriodToMonths(billingPeriod))),
    productRatePlanChargeId = ""
  )

  val subscription = Fixtures.mkSubscription()

  property("should be negative") = forAll(ratePlanChargeGen) { charge: RatePlanCharge =>
    val ratePlans = List(RatePlan("Guardian Weekly - Domestic", List(charge), "", ""))
    val currentGuardianWeeklySubscription = GuardianWeeklySubscription(subscription.copy(ratePlans = ratePlans), StoppedPublicationDate(chargedThroughDate.minusDays(1)))
    currentGuardianWeeklySubscription.right.value.credit.amount < 0
  }

  property("should never be overwhelmingly negative") = forAll(ratePlanChargeGen) { charge: RatePlanCharge =>
    val ratePlans = List(RatePlan("Guardian Weekly - Domestic", List(charge), "", ""))
    val currentGuardianWeeklySubscription = GuardianWeeklySubscription(subscription.copy(ratePlans = ratePlans), StoppedPublicationDate(chargedThroughDate.minusDays(1)))
    currentGuardianWeeklySubscription.right.value.credit.amount > -charge.price
  }
}
