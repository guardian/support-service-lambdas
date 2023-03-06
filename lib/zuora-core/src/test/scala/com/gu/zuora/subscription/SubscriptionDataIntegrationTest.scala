package com.gu.zuora.subscription

import java.time.temporal.ChronoUnit
import java.time.{DayOfWeek, LocalDate}

import com.gu.zuora.ZuoraProductTypes.ZuoraProductType
import org.scalatest.{Assertion, Inside}
import org.scalatest.matchers.should.Matchers

object SubscriptionDataIntegrationTest extends Matchers {
  def testSubscriptonDataIssueGeneration(
      subscriptionFile: String,
      startDate: LocalDate,
      expectedIssueData: List[IssueData],
      expectedTotalAnnualIssueLimitPerSubscription: Int,
      expectedProductType: ZuoraProductType,
      expectedEditionDaysOfWeek: List[DayOfWeek],
      billCycleDay: Int = 1,
  ): Assertion = {
    val subscription = Fixtures.subscriptionFromJson(subscriptionFile)
    val account = Fixtures.mkAccount(billCycleDay = billCycleDay)
    val datesToTest = getDatesToTest(startDate, expectedIssueData)

    Inside.inside(SubscriptionData(subscription, account)) { case Right(subscriptionData) =>
      datesToTest.foreach { testDate =>
        expectedIssueData.find(_.issueDate == testDate) match {
          case Some(expectedIssueData) =>
            Inside.inside(subscriptionData.issueDataForDate(testDate)) { case Right(actualIssueData) =>
              actualIssueData should equal(expectedIssueData)
            }
          case None =>
            Inside.inside(subscriptionData.issueDataForDate(testDate)) { case Left(_) => // pass
            }
        }
      }

      val (startTestDate, endTestDate) = getTestPeriod(startDate, expectedIssueData)
      subscriptionData.issueDataForPeriod(startTestDate, endTestDate) should equal(expectedIssueData)
      subscriptionData.subscriptionAnnualIssueLimit should equal(expectedTotalAnnualIssueLimitPerSubscription)
      subscriptionData.productType should equal(expectedProductType)
      subscriptionData.editionDaysOfWeek should contain only (expectedEditionDaysOfWeek: _*)
    }
  }

  private def getMaxDate(dates: List[LocalDate]): LocalDate = {
    val sortedDates = dates.sortWith((date1, date2) => date1.isBefore(date2))
    sortedDates.last
  }

  private def getDatesBetween(startDate: LocalDate, endDate: LocalDate): List[LocalDate] = {
    val daysBetweenDatesExclusive = ChronoUnit.DAYS.between(startDate, endDate)

    (0L to daysBetweenDatesExclusive).map { offset =>
      startDate.plusDays(offset)
    }.toList
  }

  private def getDatesToTest(startDate: LocalDate, expectedIssues: List[IssueData]) = {
    val (firstTestDate, maxDate) = getTestPeriod(startDate, expectedIssues)

    getDatesBetween(firstTestDate, maxDate)
  }

  private def getTestPeriod(startDate: LocalDate, expectedIssues: List[IssueData]): (LocalDate, LocalDate) = {
    (startDate.minusDays(1), getMaxDate(expectedIssues.map(_.issueDate)))
  }
}
