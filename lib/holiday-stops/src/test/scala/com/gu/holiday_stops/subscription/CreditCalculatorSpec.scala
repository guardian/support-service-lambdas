package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.{Fixtures, GuardianWeeklyHolidayStopConfig, SundayVoucherHolidayStopConfig}
import io.circe.generic.auto._
import io.circe.parser.decode
import org.scalatest._

import scala.io.Source

class CreditCalculatorSpec extends FlatSpec with Matchers with EitherValues {
  "CreditCalculator" should "calculate credit for sunday voucher subscription" in {
    checkCreditCalculation(
      zuoraSubscriptionData = "SundayVoucherSubscription.json",
      stopDate = LocalDate.of(2019, 11, 3),
      expectedCredit = -2.70
    )
  }
  it should "calculate credit for guardian weekly in 6 for 6 period" in {
    checkCreditCalculation(
      zuoraSubscriptionData = "GuardianWeeklyWith6For6.json",
      stopDate = LocalDate.of(2019, 11, 8),
      expectedCredit = -1
    )
  }
  it should "calculate credit for guardian weekly in 'normal' period" in {
    checkCreditCalculation(
      zuoraSubscriptionData = "GuardianWeeklyWith6For6.json",
      stopDate = LocalDate.of(2019, 11, 15),
      expectedCredit = -2.89
    )
  }

  it should "calculate credit for weekend vouchers saturday issue" in {
    checkCreditCalculation(
      zuoraSubscriptionData = "WeekendVoucherSubscription.json",
      stopDate = LocalDate.of(2019, 11, 16),
      expectedCredit = -2.64
    )
  }

  it should "calculate credit for weekend vouchers for a sunday issue" in {
    checkCreditCalculation(
      zuoraSubscriptionData = "WeekendVoucherSubscription.json",
      stopDate = LocalDate.of(2019, 11, 17),
      expectedCredit = -2.55
    )
  }

  private def checkCreditCalculation(zuoraSubscriptionData: String, stopDate: LocalDate, expectedCredit: Double) = {
    val subscriptionRaw = Source.fromResource(zuoraSubscriptionData).mkString
    val subscription = decode[Subscription](subscriptionRaw).getOrElse(fail(s"Could not decode $zuoraSubscriptionData"))

    Credit(Fixtures.config)(stopDate, subscription) should equal(Right(expectedCredit))
  }
}
