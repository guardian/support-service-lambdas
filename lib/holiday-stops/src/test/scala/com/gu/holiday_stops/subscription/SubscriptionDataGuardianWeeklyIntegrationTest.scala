package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.subscription.SubscriptionDataIntegrationTest.testSubscriptonDataIssueGeneration
import org.scalatest.FlatSpec

class SubscriptionDataGuardianWeeklyIntegrationTest extends FlatSpec {

  MutableCalendar.setFakeToday(Some(LocalDate.of(2019, 10, 4)))

  "SubscriptionDataIntegrationTest" should "calculate issue data correctly for GW 6 for 6" in {
    val startDate = LocalDate.parse("2019-10-04")
    val sixForSixBillingPeriod = BillingPeriod( startDate, startDate.plusWeeks(6).minusDays(1))
    val normalBillingPeriod = BillingPeriod(
      startDate.plusWeeks(6),
      startDate.plusWeeks(6).plusMonths(3).minusDays(1)
    )
    val normalBillingPeriod2 = BillingPeriod(
      startDate.plusWeeks(6).plusMonths(3),
      startDate.plusWeeks(6).plusMonths(6).minusDays(1)
    )

    val expectedIssueData = List(
      IssueData(startDate, sixForSixBillingPeriod, -1),
      IssueData(startDate.plusWeeks(1), sixForSixBillingPeriod, -1),
      IssueData(startDate.plusWeeks(2), sixForSixBillingPeriod, -1),
      IssueData(startDate.plusWeeks(3), sixForSixBillingPeriod, -1),
      IssueData(startDate.plusWeeks(4), sixForSixBillingPeriod, -1),
      IssueData(startDate.plusWeeks(5), sixForSixBillingPeriod, -1),
      IssueData(startDate.plusWeeks(6), normalBillingPeriod, -2.89),
      IssueData(startDate.plusWeeks(7), normalBillingPeriod, -2.89),
      IssueData(startDate.plusWeeks(8), normalBillingPeriod, -2.89),
      IssueData(startDate.plusWeeks(9), normalBillingPeriod, -2.89),
      IssueData(startDate.plusWeeks(10), normalBillingPeriod, -2.89),
      IssueData(startDate.plusWeeks(11), normalBillingPeriod, -2.89),
      IssueData(startDate.plusWeeks(12), normalBillingPeriod, -2.89),
      IssueData(startDate.plusWeeks(13), normalBillingPeriod, -2.89),
      IssueData(startDate.plusWeeks(14), normalBillingPeriod, -2.89),
      IssueData(startDate.plusWeeks(15), normalBillingPeriod, -2.89),
      IssueData(startDate.plusWeeks(16), normalBillingPeriod, -2.89),
      IssueData(startDate.plusWeeks(17), normalBillingPeriod, -2.89),
      IssueData(startDate.plusWeeks(18), normalBillingPeriod, -2.89),
      IssueData(startDate.plusWeeks(19), normalBillingPeriod, -2.89),
      IssueData(startDate.plusWeeks(20), normalBillingPeriod2, -2.89),
    )

    testSubscriptonDataIssueGeneration("GuardianWeeklyWith6For6.json", startDate, expectedIssueData)
  }
}
