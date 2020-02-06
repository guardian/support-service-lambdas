package com.gu.zuora.subscription

import java.time.DayOfWeek.{SATURDAY, SUNDAY}
import java.time.temporal.TemporalAdjusters
import java.time.{DayOfWeek, LocalDate}

import com.gu.zuora.ZuoraProductTypes
import com.gu.zuora.subscription.SubscriptionDataIntegrationTest.testSubscriptonDataIssueGeneration
import org.scalatest.FlatSpec

class DiscountTest extends FlatSpec {
  "Credit calculation" should "take into account discounts" in {
    val expectedDiscount = 0.5
    MutableCalendar.setFakeToday(Some(LocalDate.of(2019, 3, 16)))
    val startDate = LocalDate.parse("2019-03-16") //Sunday
    val firstSaturday = startDate.`with`(TemporalAdjusters.nextOrSame(DayOfWeek.SATURDAY))
    val firstSunday = startDate.`with`(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY))

    val billDates1 = BillDates(
      startDate,
      startDate.plusMonths(1).minusDays(1)
    )
    val billDates2 = BillDates(
      startDate.plusMonths(1),
      startDate.plusMonths(2).minusDays(1)
    )

    val expectedIssueData = List(
      IssueData(firstSaturday, billDates1, -1.28),
      IssueData(firstSunday, billDates1, -1.32),
      IssueData(firstSaturday.plusWeeks(1), billDates1, -1.28),
      IssueData(firstSunday.plusWeeks(1), billDates1, -1.32),
      IssueData(firstSaturday.plusWeeks(2), billDates1, -1.28),
      IssueData(firstSunday.plusWeeks(2), billDates1, -1.32),
      IssueData(firstSaturday.plusWeeks(3), billDates1, -1.28),
      IssueData(firstSunday.plusWeeks(3), billDates1, -1.32),
      IssueData(firstSaturday.plusWeeks(4), billDates1, -1.28),
      IssueData(firstSunday.plusWeeks(4), billDates1, -1.32),
      IssueData(firstSaturday.plusWeeks(5), billDates2, -1.28),
      IssueData(firstSunday.plusWeeks(5), billDates2, -1.32),
    )

    testSubscriptonDataIssueGeneration(
      subscriptionFile = "Discounts.json",
      startDate = startDate,
      expectedIssueData = expectedIssueData,
      expectedTotalAnnualIssueLimitPerSubscription = 8,
      expectedProductType = ZuoraProductTypes.NewspaperVoucherBook,
      expectedEditionDaysOfWeek = List(SATURDAY, SUNDAY)
    )
  }
}
