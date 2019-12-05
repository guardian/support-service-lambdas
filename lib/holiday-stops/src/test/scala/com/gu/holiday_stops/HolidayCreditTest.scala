package com.gu.holiday_stops

import java.time.{DayOfWeek, LocalDate}
import java.time.temporal.TemporalAdjusters

import com.gu.holiday_stops.subscription.{HolidayStopCredit, MutableCalendar, RatePlan, StoppedProduct}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import org.scalatest.{EitherValues, FlatSpec, Matchers}
import org.scalatest.Inside.inside

class HolidayCreditTest extends FlatSpec with Matchers with EitherValues {

  MutableCalendar.setFakeToday(Some(LocalDate.parse("2019-08-01")))

  val stoppedPublicationDate =
    StoppedPublicationDate(LocalDate.parse("2019-09-01").`with`(TemporalAdjusters.previous(DayOfWeek.FRIDAY)))

  "HolidayCredit" should "be correct for a quarterly billing period" in {
    val charge = Fixtures.mkRatePlanCharge(
      name = "GW Oct 18 - Quarterly - Domestic",
      price = 30,
      billingPeriod = "Quarter",
      effectiveStartDate = LocalDate.parse("2019-06-02")
    )
    val ratePlans = List(RatePlan("Guardian Weekly - Domestic", "GW Oct 18 - Quarterly - Domestic", List(charge), "", ""))
    val subscription = Fixtures.mkGuardianWeeklySubscription().copy(ratePlans = ratePlans)
    val currentGuardianWeeklySubscription = StoppedProduct(subscription, stoppedPublicationDate)
    inside(currentGuardianWeeklySubscription) {
      case Right(credit) => credit shouldBe HolidayStopCredit(-2.31, LocalDate.parse("2019-09-02"))
    }
  }

  it should "be correct for another quarterly billing period" in {
    val charge = Fixtures.mkRatePlanCharge(
      name = "GW Oct 18 - Quarterly - Domestic",
      price = 37.5,
      billingPeriod = "Quarter",
      effectiveStartDate = LocalDate.parse("2019-06-02")
    )
    val ratePlans = List(RatePlan("Guardian Weekly - Domestic", "GW Oct 18 - Quarterly - Domestic", List(charge), "", ""))
    val subscription = Fixtures.mkGuardianWeeklySubscription().copy(ratePlans = ratePlans)
    val currentGuardianWeeklySubscription = StoppedProduct(subscription, stoppedPublicationDate)
    val credit = currentGuardianWeeklySubscription.right.value
    credit shouldBe HolidayStopCredit(-2.89, LocalDate.parse("2019-09-02"))
  }

  it should "be correct for an annual billing period" in {
    val charge = Fixtures.mkRatePlanCharge(
      name = "GW Oct 18 - Annual - Domestic",
      price = 120,
      billingPeriod = "Annual",
      effectiveStartDate = LocalDate.parse("2018-09-02")
    )
    val ratePlans = List(RatePlan("Guardian Weekly - Domestic", "GW Oct 18 - Annual - Domestic", List(charge), "", ""))
    val subscription = Fixtures.mkGuardianWeeklySubscription().copy(ratePlans = ratePlans)
    val currentGuardianWeeklySubscription = StoppedProduct(subscription, stoppedPublicationDate)
    val credit = currentGuardianWeeklySubscription.right.value
    credit shouldBe HolidayStopCredit(-2.31, LocalDate.parse("2019-09-02"))
  }
}
