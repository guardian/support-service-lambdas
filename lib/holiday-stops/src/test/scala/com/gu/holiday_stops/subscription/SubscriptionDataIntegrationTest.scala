package com.gu.holiday_stops.subscription

import java.time.LocalDate
import java.time.temporal.ChronoUnit

import com.gu.holiday_stops.Fixtures
import org.scalatest.EitherValues._
import org.scalatest.Matchers._

object SubscriptionDataIntegrationTest {
  def testSubscriptonDataIssueGeneration(subscriptionFile: String, startDate: LocalDate, expectedIssueData: List[IssueData]) = {
    val subscription = Fixtures.subscriptionFromJson(subscriptionFile)
    val subscriptionData = SubscriptionData(subscription).right.value
    val datesToTest = getDatesToTest(startDate, expectedIssueData)

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

  private def getMaxDate(dates: List[LocalDate]): LocalDate = {
    val sortedDates = dates.sortWith((date1, date2) => date1.isBefore(date2))
    sortedDates.last
  }

  private def getDatesBetween(startDate: LocalDate, endDate: LocalDate): List[LocalDate] = {
    val daysBetweenDatesExclusive = ChronoUnit.DAYS.between(startDate, endDate)

    (0L to daysBetweenDatesExclusive)
      .map { offset =>
        startDate.plusDays(offset)
      }
      .toList
  }


  private def getDatesToTest(startDate: LocalDate, expectedIssues: List[IssueData]) = {
    val maxDate = getMaxDate(expectedIssues.map(_.issueDate))

    getDatesBetween(startDate.minusDays(1), maxDate)
  }

}
