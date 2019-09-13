package com.gu.holiday_stops

import java.time.temporal.ChronoUnit.DAYS
import java.time.temporal.{ChronoUnit, TemporalAdjusters}
import java.time.{DayOfWeek, LocalDate}

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{ProductName, ProductRatePlanKey, ProductRatePlanName, ProductType}

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
   * @param issueDayOfWeek           Weekday corresponding to publication issue date printed on the paper, for example, Friday for GW
   * @param processorRunLeadTimeDays Number of days (including one safety-net day) before publication issue date when the holiday processor runs.
   *                                 One safety-day before fulfilment day. Safety day gives us an opportunity to fix issues before fulfilment runs.
   * @param annualIssueLimit
   */
  sealed abstract class ProductSuspensionConstants(
    val issueDayOfWeek: DayOfWeek,
    val processorRunLeadTimeDays: Int,
    val annualIssueLimit: Int
  ) {
    def firstAvailableDate(today: LocalDate): LocalDate
  }

  case object GuardianWeeklySuspensionConstants extends ProductSuspensionConstants(
    issueDayOfWeek = DayOfWeek.FRIDAY,
    processorRunLeadTimeDays = 8 + (1 /* safety-day */ ), //one (safety) day before the Thursday of the week before the Friday issue day
    annualIssueLimit = 6
  ) {
    val minDaysBetweenTodayAndFirstAvailableDate = 5
    val maxDaysBetweenTodayAndFirstAvailableDate = 11
    val firstAvailableDateDayOfWeek = DayOfWeek.SATURDAY

    /**
     * If there are less than 5 days between today and the day after next publication day,
     * then Saturday after next (i.e., next-next Saturday),
     * otherwise next Saturday
     */
    def firstAvailableDate(today: LocalDate): LocalDate = {
      val dayAfterNextPublicationDay = TemporalAdjusters.next(issueDayOfWeek.plus(1)) // Saturday because GW is published on Friday, https://stackoverflow.com/a/29010338/5205022
      val firstAvailableDate =
        if (DAYS.between(today, today `with` dayAfterNextPublicationDay) < minDaysBetweenTodayAndFirstAvailableDate)
          (today `with` dayAfterNextPublicationDay `with` dayAfterNextPublicationDay) // Saturday after next
        else
          (today `with` dayAfterNextPublicationDay) // next Saturday

      verify(firstAvailableDate, today)
      firstAvailableDate
    }

    private def verify(firstAvailableDate: LocalDate, today: LocalDate): Unit = {
      val daysBetweenTodayAndFirstAvailableDate = ChronoUnit.DAYS.between(today, firstAvailableDate)
      require(
        (daysBetweenTodayAndFirstAvailableDate >= minDaysBetweenTodayAndFirstAvailableDate) &&
          (daysBetweenTodayAndFirstAvailableDate <= maxDaysBetweenTodayAndFirstAvailableDate),
        "Guardian Weekly first available date should be between 5 and 11 days from today"
      )
      require(firstAvailableDate.getDayOfWeek == firstAvailableDateDayOfWeek, "Guardian Weekly first available date should fall on Saturday")
    }
  }

  case object SundayVoucherSuspensionConstants extends ProductSuspensionConstants(
    issueDayOfWeek = DayOfWeek.SUNDAY,
    processorRunLeadTimeDays = 1,
    annualIssueLimit = 6
  ) {
    def firstAvailableDate(today: LocalDate): LocalDate = {
      today.plus(processorRunLeadTimeDays.toLong, ChronoUnit.DAYS).`with`(TemporalAdjusters.next(DayOfWeek.SUNDAY))
    }
  }

  // TODO this will likely need to change to return an array of days of week (when we support more than just GW)
  def suspensionConstantsByProduct(productNamePrefix: ProductName): ProductSuspensionConstants =
    productNamePrefix.value match {
      case s if s.startsWith("Guardian Weekly") => GuardianWeeklySuspensionConstants
      case _ => throw new RuntimeException(
        s"Failed to determine ProductSuspensionConstants because of unexpected productName: $productNamePrefix "
      )
    }

  def suspensionConstantsByProductRatePlanKey(
    productKey: ProductRatePlanKey
  ): Either[ActionCalculatorError, List[ProductSuspensionConstants]] = productKey match {
    case ProductRatePlanKey(ProductType("Newspaper - Voucher Book"), ProductRatePlanName("Sunday")) =>
      Right(List(SundayVoucherSuspensionConstants))
    case ProductRatePlanKey(ProductType("Guardian Weekly"), _) =>
      Right(List(GuardianWeeklySuspensionConstants))
    case _ =>
      Left(ActionCalculatorError(s"ProductRatePlan $productKey is not supported"))
  }

  def getProductSpecifics(productNamePrefix: ProductName, today: LocalDate = LocalDate.now()): ProductSpecifics = {
    val productSuspensionConstants = suspensionConstantsByProduct(productNamePrefix)
    import productSuspensionConstants._
    ProductSpecifics(firstAvailableDate(today), issueDayOfWeek.getValue, annualIssueLimit)
  }

  def getProductSpecificsByProductRatePlanKey(
    productRatePlanChargeId: ProductRatePlanKey,
    today: LocalDate = LocalDate.now()
  ): Either[ActionCalculatorError, List[ProductSpecifics]] = {
    suspensionConstantsByProductRatePlanKey(productRatePlanChargeId)
      .map { constants =>
        constants.map { constant =>
          ProductSpecifics(
            constant.firstAvailableDate(today),
            constant.issueDayOfWeek.getValue,
            constant.annualIssueLimit
          )
        }
      }
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
    holidayLengthInDays.toList.collect { case day if isPublicationDay(day.toLong) => stoppedDate(day.toLong) }
  }

}

case class ActionCalculatorError(message: String)
