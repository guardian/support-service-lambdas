package com.gu.zuora.subscription

import java.time.temporal.TemporalAdjusters
import java.time.{DayOfWeek, LocalDate}

import org.scalatest.Inside.inside
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class RatePlanChargeDataTest extends AnyFlatSpec with Matchers with EitherValues {

  MutableCalendar.setFakeToday(Some(LocalDate.parse("2019-08-01")))

  val stoppedPublicationDate =
    AffectedPublicationDate(LocalDate.parse("2019-09-01").`with`(TemporalAdjusters.previous(DayOfWeek.FRIDAY)))

  "RatePlanChargeData" should "calculate issue price for a quarterly billing period" in {
    testCreditCaluculation(chargeForPeriod = 30, period = "Quarter", expectedCredit = -2.31)
  }

  it should "be correct for an annual billing period" in {
    testCreditCaluculation(chargeForPeriod = 120, period = "Annual", expectedCredit = -2.31)
  }

  it should "be correct for an monthly billing period" in {
    testCreditCaluculation(chargeForPeriod = 10, period = "Month", expectedCredit = -2.50)
  }

  it should "be correct for an semi annual billing period" in {
    testCreditCaluculation(chargeForPeriod = 60, period = "Semi_Annual", expectedCredit = -2.31)
  }

  it should "be correct for an specific weeks billing period" in {
    testCreditCaluculation(
      chargeForPeriod = 6,
      period = "Specific_Weeks",
      specificBillingPeriod = Some(6),
      expectedCredit = -1,
    )
  }

  private def testCreditCaluculation(
      chargeForPeriod: Int,
      expectedCredit: Double,
      period: String,
      specificBillingPeriod: Option[Int] = None,
  ) = {
    val subscription = Fixtures.mkGuardianWeeklySubscription()

    val charge = Fixtures.mkRatePlanCharge(
      name = "Everyday",
      price = chargeForPeriod,
      billingPeriod = period,
      specificBillingPeriod = specificBillingPeriod,
      chargedThroughDate = None,
      processedThroughDate = None,
    )

    val ratePlanChargeData = RatePlanChargeData(subscription, charge, Fixtures.mkAccount(), DayOfWeek.FRIDAY)
    inside(ratePlanChargeData) { case Right(credit) =>
      credit.issueCreditAmount shouldBe expectedCredit
    }
  }
}
