package com.gu.holiday_stops

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.{HolidayStopRequest, ProductName}
import org.joda.time.{DateTimeConstants, Days, LocalDate}

object ActionCalculator {

  // TODO this will likely need to change to return an array of days of week (when we support more than just GW)
  def productNameToDayOfWeek(productName: ProductName): Int = productName.value match {
    case s if s.startsWith("Guardian Weekly") => DateTimeConstants.FRIDAY
  }

  def publicationDatesToBeStopped(hsr: HolidayStopRequest): List[LocalDate] = {

    def applicableDates(
      from: LocalDate,
      to: LocalDate,
      p: LocalDate => Boolean
    ): List[LocalDate] = {
      val dateRange = 0 to Days.daysBetween(from, to).getDays
      dateRange.foldLeft(List.empty[LocalDate]) { (acc, i) =>
        val d = from.plusDays(i)
        if (p(d)) acc :+ d
        else acc
      }
    }

    val from = hsr.Start_Date__c.value
    val to = hsr.End_Date__c.value
    val dayOfWeekForProduct = productNameToDayOfWeek(hsr.Product_Name__c)
    applicableDates(from, to, { _.dayOfWeek.get == dayOfWeekForProduct })
  }

}
