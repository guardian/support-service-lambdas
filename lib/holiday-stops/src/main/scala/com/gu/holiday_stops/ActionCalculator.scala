package com.gu.holiday_stops

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.{HolidayStopRequest, ProductName}
import org.joda.time.{DateTimeConstants, LocalDate}

import scala.annotation.tailrec

object ActionCalculator {

  // TODO this will likely need to change to return an array of days of week (when we support more than just GW)
  def productNameToDayOfWeek(productName: ProductName): Int = productName.value match {
    case s if s.startsWith("Guardian Weekly") => DateTimeConstants.FRIDAY
  }

  def publicationDatesToBeStopped(hsr: HolidayStopRequest): List[LocalDate] = {

    val dayOfWeekForProduct = productNameToDayOfWeek(hsr.Product_Name__c)

    val stopRecursionAt = hsr.End_Date__c.value.plusDays(1)

    @tailrec
    def processNextDay(listSoFar: List[LocalDate], date: LocalDate): List[LocalDate] =
      if (date == stopRecursionAt)
        listSoFar
      else if (date.getDayOfWeek == dayOfWeekForProduct)
        processNextDay(date :: listSoFar, date.plusDays(1))
      else
        processNextDay(listSoFar, date.plusDays(1))

    processNextDay(List(), hsr.Start_Date__c.value).reverse

  }

}
