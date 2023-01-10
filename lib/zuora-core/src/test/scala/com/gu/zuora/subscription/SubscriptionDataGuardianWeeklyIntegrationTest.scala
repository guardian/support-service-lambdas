package com.gu.zuora.subscription

import java.time.DayOfWeek.FRIDAY
import java.time.LocalDate

import com.gu.zuora.ZuoraProductTypes
import com.gu.zuora.subscription.SubscriptionDataIntegrationTest.testSubscriptonDataIssueGeneration
import org.scalatest.flatspec.AnyFlatSpec

class SubscriptionDataGuardianWeeklyIntegrationTest extends AnyFlatSpec {
  "SubscriptionDataIntegrationTest" should "calculate issue data correctly for GW 6 for 6" in {

    MutableCalendar.setFakeToday(Some(LocalDate.of(2019, 10, 4)))

    val startDate = LocalDate.parse("2019-10-04")
    val sixForSixBillDates = BillDates(startDate, startDate.plusWeeks(6).minusDays(1))
    val normalBillingPeriod = BillDates(
      startDate.plusWeeks(6),
      startDate.plusWeeks(6).plusMonths(3).minusDays(1),
    )
    val normalBillDates2 = BillDates(
      startDate.plusWeeks(6).plusMonths(3),
      startDate.plusWeeks(6).plusMonths(6).minusDays(1),
    )

    val expectedIssueData = List(
      IssueData(startDate, sixForSixBillDates, -1),
      IssueData(startDate.plusWeeks(1), sixForSixBillDates, -1),
      IssueData(startDate.plusWeeks(2), sixForSixBillDates, -1),
      IssueData(startDate.plusWeeks(3), sixForSixBillDates, -1),
      IssueData(startDate.plusWeeks(4), sixForSixBillDates, -1),
      IssueData(startDate.plusWeeks(5), sixForSixBillDates, -1),
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
      IssueData(startDate.plusWeeks(20), normalBillDates2, -2.89),
    )

    testSubscriptonDataIssueGeneration(
      subscriptionFile = "GuardianWeeklyWith6For6.json",
      startDate = startDate,
      expectedIssueData = expectedIssueData,
      expectedTotalAnnualIssueLimitPerSubscription = 6,
      expectedProductType = ZuoraProductTypes.GuardianWeekly,
      expectedEditionDaysOfWeek = List(FRIDAY),
    )
  }
}
