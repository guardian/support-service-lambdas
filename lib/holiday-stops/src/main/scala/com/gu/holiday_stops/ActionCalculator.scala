package com.gu.holiday_stops

import java.time.temporal.ChronoUnit

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.ProductName
import java.time.{DayOfWeek, LocalDate}

case class ProductSpecifics(
  firstAvailableDate: LocalDate,
  issueDayOfWeek: Int,
  annualIssueLimit: Int
)

object ActionCalculator {

  case class ProductSuspensionConstants(
    issueDayOfWeek: DayOfWeek,
    minLeadTimeDays: Int,
    annualIssueLimit: Int
  )

  // TODO this will likely need to change to return an array of days of week (when we support more than just GW)
  def suspensionConstantsByProduct(productName: ProductName): ProductSuspensionConstants = productName.value match {
    case s if s.startsWith("Guardian Weekly") => ProductSuspensionConstants(
      issueDayOfWeek = DayOfWeek.FRIDAY,
      minLeadTimeDays = 9, //i.e. the thursday of the week before the Friday issue day,
      annualIssueLimit = 6
    )
    //TODO handle default case (perhaps throw error)
  }

  def findNextTargetDayOfWeek(start: LocalDate, targetDayOfWeek: DayOfWeek): LocalDate =
    if (start.getDayOfWeek.getValue >= targetDayOfWeek.getValue)
      start.plusWeeks(1) `with` targetDayOfWeek
    else
      start `with` targetDayOfWeek

  def getProductSpecifics(productNamePrefix: ProductName, today: LocalDate = LocalDate.now()) = {
    val productSuspensionConstants = suspensionConstantsByProduct(productNamePrefix)
    val issueDayOfWeek = productSuspensionConstants.issueDayOfWeek
    val todayPlusMinLeadTime = today.plusDays(productSuspensionConstants.minLeadTimeDays)
    val nextIssueDayAfterTodayPlusMinLeadTime = findNextTargetDayOfWeek(todayPlusMinLeadTime, issueDayOfWeek)
    val dayAfterNextPreventableIssue = nextIssueDayAfterTodayPlusMinLeadTime.minusWeeks(1).plusDays(1)
    ProductSpecifics(
      firstAvailableDate = dayAfterNextPreventableIssue,
      issueDayOfWeek.getValue,
      productSuspensionConstants.annualIssueLimit
    )
  }

  def publicationDatesToBeStopped(
    fromInclusive: LocalDate,
    toInclusive: LocalDate,
    productName: ProductName
  ): List[LocalDate] = {
    val dayOfPublication = suspensionConstantsByProduct(productName).issueDayOfWeek
    def isPublicationDay(currentDayWithinHoliday: Long) = fromInclusive.plusDays(currentDayWithinHoliday).getDayOfWeek == dayOfPublication
    def stoppedDate(currentDayWithinHoliday: Long) = fromInclusive.plusDays(currentDayWithinHoliday)
    val holidayLengthInDays = 0 to ChronoUnit.DAYS.between(fromInclusive, toInclusive).toInt
    holidayLengthInDays.toList.collect { case day if isPublicationDay(day) => stoppedDate(day) }
  }

}
