package com.gu.holiday_stops

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.HolidayStopRequest
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.ProductName
import org.joda.time.{DateTimeConstants, Days, LocalDate}

case class ProductSpecifics(
  firstAvailableDate: LocalDate,
  issueDayOfWeek: Int,
  annualIssueLimit: Int
//TODO consider adding 'perIssueCost' (would need to be Zuora amendment preview to be accurate)
)

object ActionCalculator {

  case class ProductSuspensionConstants(
    issueDayOfWeek: Int,
    minLeadTimeDays: Int,
    annualIssueLimit: Int
  )

  // TODO this will likely need to change to return an array of days of week (when we support more than just GW)
  def suspensionConstantsByProduct(productName: ProductName): ProductSuspensionConstants = productName.value match {
    case s if s.startsWith("Guardian Weekly") => ProductSuspensionConstants(
      issueDayOfWeek = DateTimeConstants.FRIDAY,
      minLeadTimeDays = 9, //i.e. the thursday of the week before the Friday issue day,
      annualIssueLimit = 6
    )
    //TODO handle default case (perhaps throw error)
  }

  def findNextTargetDayOfWeek(start: LocalDate, targetDayOfWeek: Int): LocalDate =
    if (start.getDayOfWeek >= targetDayOfWeek)
      start.plusWeeks(1).withDayOfWeek(targetDayOfWeek)
    else
      start.withDayOfWeek(targetDayOfWeek)

  def getProductSpecifics(productNamePrefix: ProductName, today: LocalDate = LocalDate.now()) = {
    val productSuspensionConstants = suspensionConstantsByProduct(productNamePrefix)
    val issueDayOfWeek = productSuspensionConstants.issueDayOfWeek
    val todayPlusMinLeadTime = today.plusDays(productSuspensionConstants.minLeadTimeDays)
    val nextIssueDayAfterTodayPlusMinLeadTime = findNextTargetDayOfWeek(todayPlusMinLeadTime, issueDayOfWeek)
    val dayAfterNextPreventableIssue = nextIssueDayAfterTodayPlusMinLeadTime.minusWeeks(1).plusDays(1)
    ProductSpecifics(
      firstAvailableDate = dayAfterNextPreventableIssue,
      issueDayOfWeek,
      productSuspensionConstants.annualIssueLimit
    )
  }

  def publicationDatesToBeStopped(hsr: HolidayStopRequest): List[LocalDate] = publicationDatesToBeStopped(
    hsr.Start_Date__c.value,
    hsr.End_Date__c.value,
    hsr.Product_Name__c
  )

  def publicationDatesToBeStopped(
    fromInclusive: LocalDate,
    toInclusive: LocalDate,
    productName: ProductName
  ): List[LocalDate] = {
    val dayOfPublication = suspensionConstantsByProduct(productName).issueDayOfWeek
    def isPublicationDay(currentDayWithinHoliday: Int) = fromInclusive.plusDays(currentDayWithinHoliday).getDayOfWeek == dayOfPublication
    def stoppedDate(currentDayWithinHoliday: Int) = fromInclusive.plusDays(currentDayWithinHoliday)
    val holidayLengthInDays = 0 to Days.daysBetween(fromInclusive, toInclusive).getDays
    holidayLengthInDays.toList.collect { case day if isPublicationDay(day) => stoppedDate(day) }
  }

}
