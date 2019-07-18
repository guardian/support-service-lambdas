package com.gu.holiday_stops

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.HolidayStopRequest
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.ProductName
import org.joda.time.{DateTimeConstants, Days, LocalDate}

object ActionCalculator {

  // TODO this will likely need to change to return an array of days of week (when we support more than just GW)
  def dayOfPublicationByProduct(productName: ProductName): Int = productName.value match {
    case s if s.startsWith("Guardian Weekly") => DateTimeConstants.FRIDAY
  }

  def publicationDatesToBeStopped(hsr: HolidayStopRequest): List[LocalDate] = {
    val fromInclusive = hsr.Start_Date__c.value
    val toInclusive = hsr.End_Date__c.value
    val dayOfPublication = dayOfPublicationByProduct(hsr.Product_Name__c)
    def isPublicationDay(currentDayWithinHoliday: Int) = fromInclusive.plusDays(currentDayWithinHoliday).getDayOfWeek == dayOfPublication
    def stoppedDate(currentDayWithinHoliday: Int) = fromInclusive.plusDays(currentDayWithinHoliday)
    val holidayLengthInDays = 0 to Days.daysBetween(fromInclusive, toInclusive).getDays
    holidayLengthInDays.toList.collect { case day if isPublicationDay(day) => stoppedDate(day) }
  }

}
