package com.gu.holiday_stops

import java.time.temporal.ChronoUnit

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.ProductName
import java.time.{DayOfWeek, LocalDate}

case class ProductSpecifics(
  firstAvailableDate: LocalDate,
  issueDayOfWeek: Int,
  annualIssueLimit: Int
)

/**
 * For example, UAT A-S00079571
 *    - Salesforce UAT https://gnmtouchpoint--uat.cs82.my.salesforce.com/a2k3E000000pFGgQAM
 *    - https://apisandbox.zuora.com/apps/NewInvoice.do?method=view&invoice_number=INV00102837
 *
 * Holiday:                             Thu 13/08/2020 - Thu 27/08/2020
 * Publication 1 issue date:            Fri 14/08/2020
 * Publication 1 fulfillment date:      Thu 06/08/2020
 * Publication 1 processor run date:    Thu 05/08/2020
 * processDateOverride for test:        Fri 2020-08-14
 *
 * Holiday:                             Thu 13/08/2020 - Thu 27/08/2020
 * Publication 1 issue date:            Fri 21/08/2020
 * Publication 1 fulfillment date:      Thu 13/08/2020
 * Publication 1 processor run date:    Thu 12/08/2020
 * processDateOverride for test:        Fri 2020-08-21
 */
object ActionCalculator {

  /**
   * @param issueDayOfWeek Weekday corresponding to publication issue date printed on the paper, for example, Friday for GW
   * @param processorRunLeadTimeDays Number of days (including one safety-net day) before publication issue date when the holiday processor runs.
   *                                 One safety-day before fulfilment day. Safety day gives us an opportunity to fix issues before fulfilment runs.
   * @param annualIssueLimit
   */
  case class ProductSuspensionConstants(
    issueDayOfWeek: DayOfWeek,
    processorRunLeadTimeDays: Int,
    annualIssueLimit: Int
  )

  // TODO this will likely need to change to return an array of days of week (when we support more than just GW)
  def suspensionConstantsByProduct(productName: ProductName): ProductSuspensionConstants = productName.value match {
    case s if s.startsWith("Guardian Weekly") => ProductSuspensionConstants(
      issueDayOfWeek = DayOfWeek.FRIDAY,
      processorRunLeadTimeDays = 8 + (1 /* safety-day */ ), //one (safety) day before the Thursday of the week before the Friday issue day
      annualIssueLimit = 6
    )
    //TODO handle default case (perhaps throw error)
  }

  def findNextTargetDayOfWeek(start: LocalDate, targetDayOfWeek: DayOfWeek): LocalDate =
    if (start.getDayOfWeek.getValue >= targetDayOfWeek.getValue)
      start.plusWeeks(1) `with` targetDayOfWeek
    else
      start `with` targetDayOfWeek

  // first available date calculation
  def getProductSpecifics(productNamePrefix: ProductName, today: LocalDate = LocalDate.now()): ProductSpecifics = {
    val productSuspensionConstants = suspensionConstantsByProduct(productNamePrefix)
    val issueDayOfWeek = productSuspensionConstants.issueDayOfWeek // Friday for GW
    val timezoneBluntAdjustmentDays = 1 // Salesforce and client-side might be in different timezones than AWS
    val cutoffDate = today.plusDays(productSuspensionConstants.processorRunLeadTimeDays + timezoneBluntAdjustmentDays)
    val nextIssueDayAfterCutoffDate = findNextTargetDayOfWeek(cutoffDate, issueDayOfWeek)
    val firstAvailableDate = nextIssueDayAfterCutoffDate.minusWeeks(1).plusDays(1) // dayAfterNextPreventableIssue

    //    require(cutoffDate.getDayOfWeek == DayOfWeek.TUESDAY)
    val daysBetweenTodayAndFirstAvailableDate = ChronoUnit.DAYS.between(today, firstAvailableDate)
    //    println(s"today=$today ==> cutoffdate=$cutoffDate")
    println(s"nextIssueDayAfterCutoffDate=$nextIssueDayAfterCutoffDate")
    require((daysBetweenTodayAndFirstAvailableDate >= 5) && (daysBetweenTodayAndFirstAvailableDate <= 11))
    require(firstAvailableDate.getDayOfWeek == DayOfWeek.SATURDAY)

    ProductSpecifics(
      firstAvailableDate = firstAvailableDate,
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
