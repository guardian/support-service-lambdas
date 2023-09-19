package com.gu.holiday_stops

import java.time.DayOfWeek.FRIDAY
import java.time.temporal.TemporalAdjusters.next
import java.time.{DayOfWeek, LocalDate}

import com.gu.fulfilmentdates.FulfilmentDates
import com.gu.zuora.ZuoraProductTypes
import com.gu.zuora.subscription.{IssueData, SubscriptionData, ZuoraApiFailure}
import org.scalatest.matchers.should.Matchers._
import org.scalatest.matchers
import org.scalatest.flatspec.AnyFlatSpec

class GetHolidayStopRequestsTest extends AnyFlatSpec {
  val annualIssueLimit = 23

  val expectedEditionDaysOfWeek = List(FRIDAY)

  val subscriptionData = new SubscriptionData {
    override def issueDataForDate(issueDate: LocalDate): Either[ZuoraApiFailure, IssueData] = ???

    override def issueDataForPeriod(startDateInclusive: LocalDate, endDateInclusive: LocalDate): List[IssueData] = ???

    override def productType: ZuoraProductTypes.ZuoraProductType = ???

    override def subscriptionAnnualIssueLimit: Int = annualIssueLimit

    override def editionDaysOfWeek: List[DayOfWeek] = expectedEditionDaysOfWeek
  }

  val today = LocalDate.now()

  val fulfilmentDatesFirstAvailableDate = today `with` next(FRIDAY)

  val fulfilmentDates: Map[DayOfWeek, FulfilmentDates] = Map(
    FRIDAY -> FulfilmentDates(
      today = today,
      deliveryAddressChangeEffectiveDate = None,
      holidayStopFirstAvailableDate = fulfilmentDatesFirstAvailableDate,
      holidayStopProcessorTargetDate = None,
      finalFulfilmentFileGenerationDate = None,
      newSubscriptionEarliestStartDate = fulfilmentDatesFirstAvailableDate,
    ),
  )

  "GetHolidayStopRequests" should "generate GetHolidayStopRequest correctly" in {
    GetHolidayStopRequests(
      holidayStopRequests = Nil,
      subscriptionData = subscriptionData,
      fulfilmentDates = fulfilmentDates,
      fulfilmentStartDate = today,
    ) should equal(
      Right(
        GetHolidayStopRequests(
          Nil,
          List(IssueSpecifics(fulfilmentDatesFirstAvailableDate, 5)),
          annualIssueLimit,
          fulfilmentDatesFirstAvailableDate,
        ),
      ),
    )
  }
  it should "adjust first available state if fulfilment has not started" in {
    val fulfilmentStartDateInFuture = fulfilmentDatesFirstAvailableDate.plusWeeks(1)

    GetHolidayStopRequests(
      holidayStopRequests = Nil,
      subscriptionData = subscriptionData,
      fulfilmentDates = fulfilmentDates,
      fulfilmentStartDate = fulfilmentStartDateInFuture,
    ) should equal(
      Right(
        GetHolidayStopRequests(
          Nil,
          List(IssueSpecifics(fulfilmentStartDateInFuture, 5)),
          annualIssueLimit,
          fulfilmentStartDateInFuture,
        ),
      ),
    )
  }
}
