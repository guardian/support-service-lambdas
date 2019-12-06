package com.gu.holiday_stops.subscription

import java.time.{DayOfWeek, LocalDate}
import java.time.temporal.TemporalAdjusters

import com.gu.holiday_stops.subscription.SubscriptionDataIntegrationTest.testSubscriptonDataIssueGeneration
import org.scalatest.FlatSpec

class SubscriptionDateEchoLegacyIntegrationTest extends FlatSpec {
  MutableCalendar.setFakeToday(Some(LocalDate.of(2019, 10, 4)))

  /**
   * This tests the echo legacy subscription description described in EchoLegacySubscription.json
   * This subscription is for Friday/Saturday ie it has non-zero rate plan charge price for those days
   */

  "SubscriptionDataIntegrationTest" should "calculate issue data correctly for GW 6 for 6" in {
    val startDate = LocalDate.parse("2016-09-21")
    val firstFridayIssue = startDate.`with`(TemporalAdjusters.next(DayOfWeek.FRIDAY))
    val firstSaturdayIssue = startDate.`with`(TemporalAdjusters.next(DayOfWeek.SATURDAY))

    val normalBillingPeriod = BillingPeriod(
      startDate,
      startDate.plusMonths(1).minusDays(1)
    )
    val normalBillingPeriod2 = BillingPeriod(
      startDate.plusMonths(1),
      startDate.plusMonths(2).minusDays(1)
    )

    val expectedIssueData = List(
      IssueData(firstFridayIssue, normalBillingPeriod, -1.85),
      IssueData(firstSaturdayIssue, normalBillingPeriod, -2.82),
      IssueData(firstFridayIssue.plusWeeks(1), normalBillingPeriod, -1.85),
      IssueData(firstSaturdayIssue.plusWeeks(1), normalBillingPeriod, -2.82),
      IssueData(firstFridayIssue.plusWeeks(2), normalBillingPeriod, -1.85),
      IssueData(firstSaturdayIssue.plusWeeks(2), normalBillingPeriod, -2.82),
      IssueData(firstFridayIssue.plusWeeks(3), normalBillingPeriod, -1.85),
      IssueData(firstSaturdayIssue.plusWeeks(3), normalBillingPeriod, -2.82),
      IssueData(firstFridayIssue.plusWeeks(4), normalBillingPeriod2, -1.85),
      IssueData(firstSaturdayIssue.plusWeeks(4), normalBillingPeriod2, -2.82),
    )

    testSubscriptonDataIssueGeneration("EchoLegacySubscription.json", startDate, expectedIssueData)
  }
}
