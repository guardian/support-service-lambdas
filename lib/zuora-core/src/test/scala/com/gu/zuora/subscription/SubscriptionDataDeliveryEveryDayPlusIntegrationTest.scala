package com.gu.zuora.subscription

import java.time.DayOfWeek._
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters

import com.gu.zuora.ZuoraProductTypes
import com.gu.zuora.subscription.SubscriptionDataIntegrationTest.testSubscriptonDataIssueGeneration
import org.scalatest.flatspec.AnyFlatSpec

class SubscriptionDataDeliveryEveryDayPlusIntegrationTest extends AnyFlatSpec {

  /** This tests the echo legacy subscription description described in EchoLegacySubscription.json This subscription is
    * for Friday/Saturday ie it has non-zero rate plan charge price for those days
    */

  "SubscriptionData" should "calculate issue data correctly for delivery everyday plus" in {
    MutableCalendar.setFakeToday(Some(LocalDate.of(2019, 10, 4)))

    val startDate = LocalDate.parse("2019-10-06") // Sunday
    val firstSunday = startDate.`with`(TemporalAdjusters.nextOrSame(SUNDAY))
    val firstMonday = startDate.`with`(TemporalAdjusters.nextOrSame(MONDAY))
    val firstTuesday = startDate.`with`(TemporalAdjusters.nextOrSame(TUESDAY))
    val firstWednesday = startDate.`with`(TemporalAdjusters.nextOrSame(WEDNESDAY))
    val firstThursday = startDate.`with`(TemporalAdjusters.nextOrSame(THURSDAY))
    val firstFriday = startDate.`with`(TemporalAdjusters.nextOrSame(FRIDAY))
    val firstSaturday = startDate.`with`(TemporalAdjusters.nextOrSame(SATURDAY))

    val billingPeriod1 = BillDates(
      startDate,
      startDate.plusMonths(1).minusDays(1),
    )
    val billingPeriod2 = BillDates(
      startDate.plusMonths(1),
      startDate.plusMonths(2).minusDays(1),
    )

    val expectedIssueData = List(
      IssueData(firstSunday, billingPeriod1, -2.79),
      IssueData(firstMonday, billingPeriod1, -2.04),
      IssueData(firstTuesday, billingPeriod1, -2.04),
      IssueData(firstWednesday, billingPeriod1, -2.04),
      IssueData(firstThursday, billingPeriod1, -2.04),
      IssueData(firstFriday, billingPeriod1, -2.04),
      IssueData(firstSaturday, billingPeriod1, -2.72),
      IssueData(firstSunday.plusWeeks(1), billingPeriod1, -2.79),
      IssueData(firstMonday.plusWeeks(1), billingPeriod1, -2.04),
      IssueData(firstTuesday.plusWeeks(1), billingPeriod1, -2.04),
      IssueData(firstWednesday.plusWeeks(1), billingPeriod1, -2.04),
      IssueData(firstThursday.plusWeeks(1), billingPeriod1, -2.04),
      IssueData(firstFriday.plusWeeks(1), billingPeriod1, -2.04),
      IssueData(firstSaturday.plusWeeks(1), billingPeriod1, -2.72),
      IssueData(firstSunday.plusWeeks(2), billingPeriod1, -2.79),
      IssueData(firstMonday.plusWeeks(2), billingPeriod1, -2.04),
      IssueData(firstTuesday.plusWeeks(2), billingPeriod1, -2.04),
      IssueData(firstWednesday.plusWeeks(2), billingPeriod1, -2.04),
      IssueData(firstThursday.plusWeeks(2), billingPeriod1, -2.04),
      IssueData(firstFriday.plusWeeks(2), billingPeriod1, -2.04),
      IssueData(firstSaturday.plusWeeks(2), billingPeriod1, -2.72),
      IssueData(firstSunday.plusWeeks(3), billingPeriod1, -2.79),
      IssueData(firstMonday.plusWeeks(3), billingPeriod1, -2.04),
      IssueData(firstTuesday.plusWeeks(3), billingPeriod1, -2.04),
      IssueData(firstWednesday.plusWeeks(3), billingPeriod1, -2.04),
      IssueData(firstThursday.plusWeeks(3), billingPeriod1, -2.04),
      IssueData(firstFriday.plusWeeks(3), billingPeriod1, -2.04),
      IssueData(firstSaturday.plusWeeks(3), billingPeriod1, -2.72),
      IssueData(firstSunday.plusWeeks(4), billingPeriod1, -2.79),
      IssueData(firstMonday.plusWeeks(4), billingPeriod1, -2.04),
      IssueData(firstTuesday.plusWeeks(4), billingPeriod1, -2.04),
      IssueData(firstWednesday.plusWeeks(4), billingPeriod2, -2.04),
      IssueData(firstThursday.plusWeeks(4), billingPeriod2, -2.04),
      IssueData(firstFriday.plusWeeks(4), billingPeriod2, -2.04),
      IssueData(firstSaturday.plusWeeks(4), billingPeriod2, -2.72),
    )

    testSubscriptonDataIssueGeneration(
      subscriptionFile = "DeliveryEveryDatePlusSubscription.json",
      startDate = startDate,
      expectedIssueData = expectedIssueData,
      expectedTotalAnnualIssueLimitPerSubscription = 42,
      expectedProductType = ZuoraProductTypes.NewspaperHomeDelivery,
      expectedEditionDaysOfWeek = List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY),
    )
  }
}
