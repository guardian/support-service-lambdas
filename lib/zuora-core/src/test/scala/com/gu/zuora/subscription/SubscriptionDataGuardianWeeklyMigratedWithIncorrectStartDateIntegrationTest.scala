package com.gu.zuora.subscription

import java.time.DayOfWeek.FRIDAY
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters.next

import com.gu.zuora.ZuoraProductTypes
import com.gu.zuora.subscription.SubscriptionDataIntegrationTest.testSubscriptonDataIssueGeneration
import org.scalatest.flatspec.AnyFlatSpec

class SubscriptionDataGuardianWeeklyMigratedWithIncorrectStartDateIntegrationTest extends AnyFlatSpec {
  "SubscriptionData" should "calculate issue data correctly for migrated GW with incorrect start date" in {
    MutableCalendar.setFakeToday(Some(LocalDate.of(2020, 1, 1)))

    val startDate = LocalDate.parse("2017-12-31")
    val firstIssueDate = startDate `with` next(FRIDAY)
    val normalBillingPeriod = BillDates(
      startDate,
      startDate.plusMonths(3).minusDays(1),
    )
    val normalBillDates2 = BillDates(
      startDate.plusMonths(3),
      startDate.plusMonths(6).minusDays(1),
    )

    val expectedIssueData = List(
      IssueData(firstIssueDate, normalBillingPeriod, -2.93),
      IssueData(firstIssueDate.plusWeeks(1), normalBillingPeriod, -2.93),
      IssueData(firstIssueDate.plusWeeks(2), normalBillingPeriod, -2.93),
      IssueData(firstIssueDate.plusWeeks(3), normalBillingPeriod, -2.93),
      IssueData(firstIssueDate.plusWeeks(4), normalBillingPeriod, -2.93),
      IssueData(firstIssueDate.plusWeeks(5), normalBillingPeriod, -2.93),
      IssueData(firstIssueDate.plusWeeks(6), normalBillingPeriod, -2.93),
      IssueData(firstIssueDate.plusWeeks(7), normalBillingPeriod, -2.93),
      IssueData(firstIssueDate.plusWeeks(8), normalBillingPeriod, -2.93),
      IssueData(firstIssueDate.plusWeeks(9), normalBillingPeriod, -2.93),
      IssueData(firstIssueDate.plusWeeks(10), normalBillingPeriod, -2.93),
      IssueData(firstIssueDate.plusWeeks(11), normalBillingPeriod, -2.93),
      IssueData(firstIssueDate.plusWeeks(12), normalBillingPeriod, -2.93),
      IssueData(firstIssueDate.plusWeeks(13), normalBillDates2, -2.93),
      IssueData(firstIssueDate.plusWeeks(14), normalBillDates2, -2.93),
      IssueData(firstIssueDate.plusWeeks(15), normalBillDates2, -2.93),
      IssueData(firstIssueDate.plusWeeks(16), normalBillDates2, -2.93),
      IssueData(firstIssueDate.plusWeeks(17), normalBillDates2, -2.93),
      IssueData(firstIssueDate.plusWeeks(18), normalBillDates2, -2.93),
      IssueData(firstIssueDate.plusWeeks(19), normalBillDates2, -2.93),
      IssueData(firstIssueDate.plusWeeks(20), normalBillDates2, -2.93),
      IssueData(firstIssueDate.plusWeeks(21), normalBillDates2, -2.93),
      IssueData(firstIssueDate.plusWeeks(22), normalBillDates2, -2.93),
    )

    testSubscriptonDataIssueGeneration(
      subscriptionFile = "GuardianWeeklyMigratedWithIncorrectStartDate.json",
      startDate = startDate,
      expectedIssueData = expectedIssueData,
      expectedTotalAnnualIssueLimitPerSubscription = 6,
      expectedProductType = ZuoraProductTypes.GuardianWeekly,
      expectedEditionDaysOfWeek = List(FRIDAY),
    )
  }
}
