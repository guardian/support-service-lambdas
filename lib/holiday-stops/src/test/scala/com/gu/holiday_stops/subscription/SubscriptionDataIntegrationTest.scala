package com.gu.holiday_stops.subscription

import java.time.LocalDate
import java.time.temporal.ChronoUnit

import com.gu.holiday_stops.Fixtures
import com.gu.zuora.ZuoraProductTypes.ZuoraProductType
import org.scalatest.EitherValues._
import org.scalatest.Inside
import org.scalatest.Matchers._

object SubscriptionDataIntegrationTest {
  def testSubscriptonDataIssueGeneration(
                                          subscriptionFile: String,
                                          startDate: LocalDate,
                                          expectedIssueData: List[IssueData],
                                          expectedTotalAnnualIssueLimitPerSubscription: Int,
                                          expectedProductType: ZuoraProductType
  ) = {
    val subscription = Fixtures.subscriptionFromJson(subscriptionFile)
    val subscriptionData = SubscriptionData(subscription).right.value
    val datesToTest = getDatesToTest(startDate, expectedIssueData)

    datesToTest.foreach { testDate =>
      expectedIssueData.find(_.issueDate == testDate) match {
        case Some(expectedIssueData) =>
          Inside.inside(subscriptionData.issueDataForDate(testDate)) {
            case Right(actualIssueData) => actualIssueData should equal(expectedIssueData)
          }
        case None =>
          Inside.inside(subscriptionData.issueDataForDate(testDate)) {
            case Left(_) => //pass
          }
      }
    }

    val (startTestDate, endTestDate) = getTestPeriod(startDate, expectedIssueData)
    subscriptionData.issueDataForPeriod(startTestDate, endTestDate) should equal(expectedIssueData)

    subscriptionData.subscriptionAnnualIssueLimit should equal(expectedTotalAnnualIssueLimitPerSubscription)
    subscriptionData.productType should equal(expectedProductType)
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
    val (firstTestDate, maxDate) = getTestPeriod(startDate, expectedIssues)

    getDatesBetween(firstTestDate, maxDate)
  }

  private def getTestPeriod(startDate: LocalDate, expectedIssues: List[IssueData]): (LocalDate, LocalDate) = {
    (startDate.minusDays(1), getMaxDate(expectedIssues.map(_.issueDate)))
  }
}
