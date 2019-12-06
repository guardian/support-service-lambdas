package com.gu.holiday_stops.subscription

import java.time.LocalDate
import java.time.temporal.ChronoUnit
import com.gu.holiday_stops.Fixtures
import org.scalatest.{EitherValues, FlatSpec, Matchers}

class SubscriptionDataIntegrationTest extends FlatSpec with Matchers with EitherValues {
  MutableCalendar.setFakeToday(Some(LocalDate.of(2019, 10, 4)))

  "SubscriptionDataIntegrationTest" should "calculate issue data correctly for GW 6 for 6" in {
    val subscriptionFile = "GuardianWeeklyWith6For6.json"
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

    testSubscriptonDataIssueGeneration(subscriptionFile, startDate, expectedIssueData)
  }

  private def testSubscriptonDataIssueGeneration(subscriptionFile: String, startDate: LocalDate, expectedIssueData: List[IssueData]) = {
    val subscription = Fixtures.subscriptionFromJson(subscriptionFile)
    val subscriptionData = SubscriptionData(subscription).right.value
    val datesToTest = getDatesToTest(expectedIssueData)

    subscriptionData.issueDataForDate(startDate.minusDays(1)).isLeft should equal(true)

    datesToTest.foreach { testDate =>
      println(s"testing date $testDate")
      expectedIssueData.find(_.issueDate == testDate) match {
        case Some(expectedIssueData) =>
          subscriptionData.issueDataForDate(testDate).right.value should equal(expectedIssueData)
        case None =>
          subscriptionData.issueDataForDate(testDate).isLeft should equal(true)
      }
    }
  }

  private def getMaxMinDates(dates: List[LocalDate]): (LocalDate, LocalDate) = {
    val sortedDates = dates.sortWith((date1, date2) => date1.isBefore(date2))
    (sortedDates.head, sortedDates.last)
  }

  private def getDatesBetween(startDate: LocalDate, endDate: LocalDate): List[LocalDate] = {
    val daysBetweenDatesExclusive = ChronoUnit.DAYS.between(startDate, endDate)

    (0L to daysBetweenDatesExclusive)
      .map { offset =>
        startDate.plusDays(offset)
      }
      .toList
  }


  private def getDatesToTest(expectedIssues: List[IssueData]) = {
    val (minDate, maxDate) = getMaxMinDates(expectedIssues.map(_.issueDate))

    val datesCoveringExpectedIssuesPeriod = getDatesBetween(minDate, maxDate)

    val dateBeforeExpectedIssues = minDate.minusDays(1)

    (dateBeforeExpectedIssues :: datesCoveringExpectedIssuesPeriod)
  }
}
