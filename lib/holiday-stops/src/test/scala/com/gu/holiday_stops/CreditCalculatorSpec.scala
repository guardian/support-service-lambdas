package com.gu.holiday_stops

import java.time.LocalDate

import io.circe.generic.auto._
import io.circe.parser.decode
import org.scalatest._

import scala.io.Source

class CreditCalculatorSpec extends FlatSpec with Matchers with EitherValues {
  "CreditCalculator" should "calculate credit for sunday voucher subscription" in {
    checkCreditCalculation(
      zuoraSubscriptionData = "SundayVoucherSubscription.json",
      stopDate = LocalDate.of(2019, 11, 3),
      expectedCredit =  -2.70
    )
  }
  it should "calculate credit for guardian weekly in 6 for 6 period" in {
    checkCreditCalculation(
      zuoraSubscriptionData = "GuardianWeeklyWith6For6.json",
      stopDate = LocalDate.of(2019, 11, 8),
      expectedCredit =  -1
    )
  }
  it should "calculate credit for guardian weekly in 'normal' period" in {
    checkCreditCalculation(
      zuoraSubscriptionData = "GuardianWeeklyWith6For6.json",
      stopDate = LocalDate.of(2019, 11, 15),
      expectedCredit =  -2.89
    )
  }

  private def checkCreditCalculation(zuoraSubscriptionData: String, stopDate: LocalDate, expectedCredit: Double) = {
    val subscriptionRaw = Source.fromResource(zuoraSubscriptionData).mkString
    val subscription = decode[Subscription](subscriptionRaw).getOrElse(fail(s"Could not decode $zuoraSubscriptionData"))

    CreditCalculator.calculateCredit(
      GuardianWeeklyHolidayStopConfig.Dev.productRatePlanIds,
      GuardianWeeklyHolidayStopConfig.Dev.nForNProductRatePlanIds,
      SundayVoucherHolidayStopConfig.Dev.productRatePlanChargeId,
      stopDate
    )(subscription) should equal(Right(expectedCredit))
  }
}
