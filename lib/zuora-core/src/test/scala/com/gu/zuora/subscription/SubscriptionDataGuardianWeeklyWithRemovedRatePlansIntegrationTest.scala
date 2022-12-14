package com.gu.zuora.subscription

import java.time.DayOfWeek.FRIDAY
import java.time.LocalDate

import com.gu.zuora.ZuoraProductTypes
import com.gu.zuora.subscription.SubscriptionDataIntegrationTest.testSubscriptonDataIssueGeneration
import org.scalatest.flatspec.AnyFlatSpec

class SubscriptionDataGuardianWeeklyWithRemovedRatePlansIntegrationTest extends AnyFlatSpec {

  /** This tests GuardianWeeklyWith6For6WithChristmasFix.json which is a subscription that has modified rateplans that
    * that were fixed because the 6 for 6 period fell over christmas and customers would not have received one of their
    * introductory 6 issues. The 6 for 6 rate plan charge was extended for two months.
    */
  "SubscriptionDataIntegrationTest" should "calculate issue data correctly for GW 6 for 6 subs that have been 'hacked' for christmas" in {
    MutableCalendar.setFakeToday(Some(LocalDate.of(2019, 10, 4)))

    val startDate = LocalDate.parse("2019-11-22")
    val modifiedSixForSixBillDates = BillDates(startDate, startDate.plusMonths(2).minusDays(1))
    val normalBillingPeriod = BillDates(
      startDate.plusMonths(2),
      startDate.plusMonths(2).plusMonths(3).minusDays(1),
    )
    val normalBillDates2 = BillDates(
      startDate.plusMonths(2).plusMonths(3),
      startDate.plusMonths(2).plusMonths(3).plusMonths(3).minusDays(1),
    )

    val expectedIssueData = List(
      IssueData(startDate, modifiedSixForSixBillDates, -.75),
      IssueData(startDate.plusWeeks(1), modifiedSixForSixBillDates, -.75),
      IssueData(startDate.plusWeeks(2), modifiedSixForSixBillDates, -.75),
      IssueData(startDate.plusWeeks(3), modifiedSixForSixBillDates, -.75),
      IssueData(startDate.plusWeeks(4), modifiedSixForSixBillDates, -.75),
      IssueData(startDate.plusWeeks(5), modifiedSixForSixBillDates, -.75),
      IssueData(startDate.plusWeeks(6), modifiedSixForSixBillDates, -.75),
      IssueData(startDate.plusWeeks(7), modifiedSixForSixBillDates, -.75),
      IssueData(startDate.plusWeeks(8), modifiedSixForSixBillDates, -.75),
      IssueData(startDate.plusWeeks(9), normalBillingPeriod, -5.77),
      IssueData(startDate.plusWeeks(10), normalBillingPeriod, -5.77),
      IssueData(startDate.plusWeeks(11), normalBillingPeriod, -5.77),
      IssueData(startDate.plusWeeks(12), normalBillingPeriod, -5.77),
      IssueData(startDate.plusWeeks(13), normalBillingPeriod, -5.77),
      IssueData(startDate.plusWeeks(14), normalBillingPeriod, -5.77),
      IssueData(startDate.plusWeeks(15), normalBillingPeriod, -5.77),
      IssueData(startDate.plusWeeks(16), normalBillingPeriod, -5.77),
      IssueData(startDate.plusWeeks(17), normalBillingPeriod, -5.77),
      IssueData(startDate.plusWeeks(18), normalBillingPeriod, -5.77),
      IssueData(startDate.plusWeeks(19), normalBillingPeriod, -5.77),
      IssueData(startDate.plusWeeks(20), normalBillingPeriod, -5.77),
      IssueData(startDate.plusWeeks(21), normalBillingPeriod, -5.77),
      IssueData(startDate.plusWeeks(22), normalBillDates2, -5.77),
    )

    testSubscriptonDataIssueGeneration(
      subscriptionFile = "GuardianWeeklyWith6For6WithChristmasFix.json",
      startDate = startDate,
      expectedIssueData = expectedIssueData,
      expectedTotalAnnualIssueLimitPerSubscription = 6,
      expectedProductType = ZuoraProductTypes.GuardianWeekly,
      expectedEditionDaysOfWeek = List(FRIDAY),
    )
  }
}
