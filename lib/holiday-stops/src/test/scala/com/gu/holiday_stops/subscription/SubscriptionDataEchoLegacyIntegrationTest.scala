package com.gu.holiday_stops.subscription

import java.time.{DayOfWeek, LocalDate}
import java.time.temporal.TemporalAdjusters

import com.gu.holiday_stops.subscription.SubscriptionDataIntegrationTest.testSubscriptonDataIssueGeneration
import com.gu.zuora.ZuoraProductTypes
import org.scalatest.FlatSpec

class SubscriptionDataEchoLegacyIntegrationTest extends FlatSpec {
  MutableCalendar.setFakeToday(Some(LocalDate.of(2019, 10, 4)))

  /**
   * This tests the echo legacy subscription description described in EchoLegacySubscription.json
   * This subscription is for Friday/Saturday ie it has non-zero rate plan charge price for those days
   */

  "SubscriptionData" should "calculate issue data correctly for echo legacy subscription" in {
    val startDate = LocalDate.parse("2016-09-21")
    val firstFridayIssue = startDate.`with`(TemporalAdjusters.next(DayOfWeek.FRIDAY))
    val firstSaturdayIssue = startDate.`with`(TemporalAdjusters.next(DayOfWeek.SATURDAY))

    val normalBillDates = BillDates(
      startDate,
      startDate.plusMonths(1).minusDays(1)
    )
    val normalBillDates2 = BillDates(
      startDate.plusMonths(1),
      startDate.plusMonths(2).minusDays(1)
    )

    val expectedIssueData = List(
      IssueData(firstFridayIssue, normalBillDates, -1.85),
      IssueData(firstSaturdayIssue, normalBillDates, -2.82),
      IssueData(firstFridayIssue.plusWeeks(1), normalBillDates, -1.85),
      IssueData(firstSaturdayIssue.plusWeeks(1), normalBillDates, -2.82),
      IssueData(firstFridayIssue.plusWeeks(2), normalBillDates, -1.85),
      IssueData(firstSaturdayIssue.plusWeeks(2), normalBillDates, -2.82),
      IssueData(firstFridayIssue.plusWeeks(3), normalBillDates, -1.85),
      IssueData(firstSaturdayIssue.plusWeeks(3), normalBillDates, -2.82),
      IssueData(firstFridayIssue.plusWeeks(4), normalBillDates2, -1.85),
      IssueData(firstSaturdayIssue.plusWeeks(4), normalBillDates2, -2.82),
    )

    testSubscriptonDataIssueGeneration(
      subscriptionFile = "EchoLegacySubscription.json",
      startDate = startDate,
      expectedIssueData = expectedIssueData,
      expectedTotalAnnualIssueLimitPerSubscription = 8,
      expectedProductType = ZuoraProductTypes.NewspaperHomeDelivery
    )
  }
}
