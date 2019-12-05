package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.Fixtures
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import org.scalactic.TypeCheckedTripleEquals
import org.scalatest._

class CreditCalculatorSpec extends FlatSpec with Matchers with EitherValues with TypeCheckedTripleEquals {
  MutableCalendar.setFakeToday(Some(LocalDate.of(2019, 10, 1)))

  "CreditCalculator" should "calculate credit for sunday voucher subscription" in {
    checkCreditCalculation(
      zuoraSubscriptionData = "SundayVoucherSubscription.json",
      stopDate = LocalDate.of(2019, 11, 3),
      expectedCredit = HolidayStopCredit(-2.70, LocalDate.parse("2019-11-06"))
    )
  }
  it should "calculate credit for guardian weekly in 6 for 6 period" in {
    checkCreditCalculation(
      zuoraSubscriptionData = "GuardianWeeklyWith6For6.json",
      stopDate = LocalDate.of(2019, 11, 8),
      expectedCredit = HolidayStopCredit(-1.00, LocalDate.parse("2019-11-15"))
    )
  }
  it should "calculate credit for guardian weekly in 'normal' period" in {
    checkCreditCalculation(
      zuoraSubscriptionData = "GuardianWeeklyWith6For6.json",
      stopDate = LocalDate.of(2019, 11, 15),
      expectedCredit = HolidayStopCredit(-2.89, LocalDate.parse("2020-02-15"))
    )
  }

  it should "calculate credit for weekend vouchers Saturday issue" in {
    checkCreditCalculation(
      zuoraSubscriptionData = "WeekendVoucherSubscription.json",
      stopDate = LocalDate.of(2019, 11, 16),
      expectedCredit = HolidayStopCredit(-2.64, LocalDate.parse("2019-11-26"))
    )
  }

  it should "calculate credit for weekend vouchers for a sunday issue" in {
    checkCreditCalculation(
      zuoraSubscriptionData = "WeekendVoucherSubscription.json",
      stopDate = LocalDate.of(2019, 11, 17),
      expectedCredit = HolidayStopCredit(-2.55, LocalDate.parse("2019-11-26"))
    )
  }

  private def checkCreditCalculation(zuoraSubscriptionData: String, stopDate: LocalDate, expectedCredit: HolidayStopCredit) = {
    val subscription = Fixtures.subscriptionFromJson(zuoraSubscriptionData)
    Inside.inside(StoppedProduct(subscription, StoppedPublicationDate(stopDate))) {
      case Right(stoppedProduct) =>
        stoppedProduct should ===(expectedCredit)
    }
  }
}
