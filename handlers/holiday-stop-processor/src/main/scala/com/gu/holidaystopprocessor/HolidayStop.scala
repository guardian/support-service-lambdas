package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holiday_stops.ActionCalculator
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.{HolidayStopRequest, HolidayStopRequestId}
import com.gu.util.Time

case class HolidayStop(
  requestId: HolidayStopRequestId,
  subscriptionName: String,
  stoppedPublicationDate: LocalDate
)

object HolidayStops {

  def apply(request: HolidayStopRequest): Seq[HolidayStop] =
    ActionCalculator.publicationDatesToBeStopped(request) map { date =>
      HolidayStop(
        requestId = request.Id,
        subscriptionName = request.Subscription_Name__c.value,
        stoppedPublicationDate = Time.toJavaDate(date)
      )
    }
}
