package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holiday_stops.ActionCalculator
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.HolidayStopRequest

case class HolidayStop(
  subscriptionName: String,
  stoppedPublicationDate: LocalDate
)

object HolidayStop {

  def holidayStopsToApply(config: Config): Either[String, List[HolidayStop]] =
    Salesforce.holidayStopRequests(config, "Guardian Weekly") map {
      _ flatMap toHolidayStops
    }

  private def toHolidayStops(request: HolidayStopRequest): List[HolidayStop] =
    ActionCalculator.publicationDatesToBeStopped(request) map { date =>
      HolidayStop(request.Subscription_Name__c.value, Time.toJavaDate(date))
    }
}
