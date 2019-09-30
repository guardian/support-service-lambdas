package com.gu.holiday_stops

import java.time.temporal.ChronoUnit.DAYS
import java.time.temporal.{ChronoUnit, TemporalAdjusters}
import java.time.{DayOfWeek, LocalDate}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.Product._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{Product, ProductName, ProductRatePlanName, ProductType}

case class LegacyProductSpecifics(
  firstAvailableDate: LocalDate,
  issueDayOfWeek: Int,
  annualIssueLimit: Int
)

case class ProductSpecifics(
  annualIssueLimit: Int,
  issueSpecifics: List[IssueSpecifics]
)

case class IssueSpecifics(
  firstAvailableDate: LocalDate,
  issueDayOfWeek: Int,
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
   * @param annualIssueLimit         Maximum number of days holidays that can be taken annually for a subscription
   * @param issueConstants           Constants specific to the issues covered by the type of subscription
   */
  case class SuspensionConstants(
    annualIssueLimit: Int,
    issueConstants: List[IssueSuspensionConstants]
  )

  /**
   * @param issueDayOfWeek           Weekday corresponding to publication issue date printed on the paper, for example, Friday for GW
   * @param processorRunLeadTimeDays Number of days (including one safety-net day) before publication issue date when the holiday processor runs.
   *                                 One safety-day before fulfilment day. Safety day gives us an opportunity to fix issues before fulfilment runs.
   */
  sealed abstract class IssueSuspensionConstants(
    val issueDayOfWeek: DayOfWeek,
    val processorRunLeadTimeDays: Int
  ) {
    /**
     * The first date a holiday can started on for this issue when creating a stop on the supplied date
     * @param today          Date the holiday is being created on
     */
    def firstAvailableDate(today: LocalDate): LocalDate
  }

  val GuardianWeeklySuspensionConstants = SuspensionConstants(
    annualIssueLimit = 6,
    issueConstants = List(GuardianWeeklyIssueSuspensionConstants)
  )

  case object GuardianWeeklyIssueSuspensionConstants extends IssueSuspensionConstants(
    issueDayOfWeek = DayOfWeek.FRIDAY,
    processorRunLeadTimeDays = 8 + (1 /* safety-day */ ), //one (safety) day before the Thursday of the week before the Friday issue day
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

  val SaturdayVoucherSuspensionConstants = voucherSuspensionConstans(
    List(voucherIssueSuspensionConstants(DayOfWeek.SATURDAY))
  )

  val SundayVoucherSuspensionConstants = voucherSuspensionConstans(
    List(voucherIssueSuspensionConstants(DayOfWeek.SUNDAY))
  )

  val WeekendVoucherSuspensionConstants = voucherSuspensionConstans(
    List(
      voucherIssueSuspensionConstants(DayOfWeek.SATURDAY),
      voucherIssueSuspensionConstants(DayOfWeek.SUNDAY)
    )
  )

  val SixdayVoucherSuspensionConstants = voucherSuspensionConstans(
    List(
      voucherIssueSuspensionConstants(DayOfWeek.MONDAY),
      voucherIssueSuspensionConstants(DayOfWeek.TUESDAY),
      voucherIssueSuspensionConstants(DayOfWeek.WEDNESDAY),
      voucherIssueSuspensionConstants(DayOfWeek.THURSDAY),
      voucherIssueSuspensionConstants(DayOfWeek.FRIDAY),
      voucherIssueSuspensionConstants(DayOfWeek.SATURDAY),
    )
  )

  val EverydayVoucherSuspensionConstants = voucherSuspensionConstans(
    List(
      voucherIssueSuspensionConstants(DayOfWeek.MONDAY),
      voucherIssueSuspensionConstants(DayOfWeek.TUESDAY),
      voucherIssueSuspensionConstants(DayOfWeek.WEDNESDAY),
      voucherIssueSuspensionConstants(DayOfWeek.THURSDAY),
      voucherIssueSuspensionConstants(DayOfWeek.FRIDAY),
      voucherIssueSuspensionConstants(DayOfWeek.SATURDAY),
      voucherIssueSuspensionConstants(DayOfWeek.SUNDAY),
    )
  )

  val EverydayPlusVoucherSuspensionConstants = EverydayVoucherSuspensionConstants
  val SixdayPlusVoucherSuspensionConstants = SixdayVoucherSuspensionConstants
  val WeekendPlusVoucherSuspensionConstants = WeekendVoucherSuspensionConstants
  val SundayPlusVoucherSuspensionConstants = SundayVoucherSuspensionConstants
  val SaturdayPlusVoucherSuspensionConstants = SaturdayVoucherSuspensionConstants

  def voucherSuspensionConstans(issueSuspensionConstants: List[IssueSuspensionConstants]) =
    SuspensionConstants(issueSuspensionConstants.size * 6, issueSuspensionConstants)

  lazy val VoucherProcessorLeadTime: Int = 1

  def voucherIssueSuspensionConstants(dayOfWeek: DayOfWeek): IssueSuspensionConstants =
    new IssueSuspensionConstants(
      issueDayOfWeek = dayOfWeek,
      processorRunLeadTimeDays = VoucherProcessorLeadTime
    ) {
      def firstAvailableDate(today: LocalDate): LocalDate = {
        today.plus(processorRunLeadTimeDays.toLong, ChronoUnit.DAYS)
      }
    }

  // TODO this will likely need to change to return an array of days of week (when we support more than just GW)
  def suspensionConstantsByProduct(productNamePrefix: ProductName): SuspensionConstants =
    productNamePrefix.value match {
      case s if s.startsWith("Guardian Weekly") => GuardianWeeklySuspensionConstants
      case _ => throw new RuntimeException(
        s"Failed to determine ProductSuspensionConstants because of unexpected productName: $productNamePrefix "
      )
    }

  def suspensionConstantsByProductRatePlanKey(product: Product): Either[ActionCalculatorError, SuspensionConstants] =
    product match {
      case GuardianWeekly => Right(GuardianWeeklySuspensionConstants)
      case SaturdayVoucher => Right(SaturdayVoucherSuspensionConstants)
      case SundayVoucher => Right(SundayVoucherSuspensionConstants)
      case WeekendVoucher => Right(WeekendVoucherSuspensionConstants)
      case SixdayVoucher => Right(SixdayVoucherSuspensionConstants)
      case EverydayVoucher => Right(EverydayVoucherSuspensionConstants)
      case SaturdayPlusVoucher => Right(SaturdayPlusVoucherSuspensionConstants)
      case SundayPlusVoucher => Right(SundayPlusVoucherSuspensionConstants)
      case WeekendPlusVoucher => Right(WeekendPlusVoucherSuspensionConstants)
      case SixdayPlusVoucher => Right(SixdayPlusVoucherSuspensionConstants)
      case EverydayPlusVoucher => Right(EverydayPlusVoucherSuspensionConstants)
      case _ => Left(ActionCalculatorError(s"ProductRatePlan $product is not supported"))
    }

  def getProductSpecifics(productNamePrefix: ProductName, today: LocalDate = LocalDate.now()): LegacyProductSpecifics = {
    val productSuspensionConstants = suspensionConstantsByProduct(productNamePrefix)
    val firstIssueConstants = productSuspensionConstants.issueConstants(0)
    LegacyProductSpecifics(
      firstIssueConstants.firstAvailableDate(today),
      firstIssueConstants.issueDayOfWeek.getValue,
      productSuspensionConstants.annualIssueLimit
    )
  }

  def getProductSpecificsByProductRatePlanKey(
    product: Product,
    today: LocalDate = LocalDate.now()
  ): Either[ActionCalculatorError, ProductSpecifics] = {
    suspensionConstantsByProductRatePlanKey(product)
      .map { constants =>
        ProductSpecifics(
          constants.annualIssueLimit,
          constants.issueConstants.map { issueConstants =>
            IssueSpecifics(
              issueConstants.firstAvailableDate(today),
              issueConstants.issueDayOfWeek.getValue
            )
          }
        )
      }
  }

  def publicationDatesToBeStopped(
    fromInclusive: LocalDate,
    toInclusive: LocalDate,
    productName: ProductName
  ): List[LocalDate] = {
    val firstIssue = suspensionConstantsByProduct(productName).issueConstants(0)
    val dayOfPublication = firstIssue.issueDayOfWeek

    def isPublicationDay(currentDayWithinHoliday: Long) = fromInclusive.plusDays(currentDayWithinHoliday).getDayOfWeek == dayOfPublication

    def stoppedDate(currentDayWithinHoliday: Long) = fromInclusive.plusDays(currentDayWithinHoliday)

    val holidayLengthInDays = 0 to ChronoUnit.DAYS.between(fromInclusive, toInclusive).toInt
    holidayLengthInDays.toList.collect { case day if isPublicationDay(day.toLong) => stoppedDate(day.toLong) }
  }

  def publicationDatesToBeStopped(
    fromInclusive: LocalDate,
    toInclusive: LocalDate,
    product: Product): Either[ActionCalculatorError, List[LocalDate]] = {

    suspensionConstantsByProductRatePlanKey(product).map { suspensionConstants =>
      val daysOfPublication = suspensionConstants.issueConstants.map(_.issueDayOfWeek)

      def isPublicationDay(currentDayWithinHoliday: Long) =
        daysOfPublication.contains(fromInclusive.plusDays(currentDayWithinHoliday).getDayOfWeek)

      def stoppedDate(currentDayWithinHoliday: Long) = fromInclusive.plusDays(currentDayWithinHoliday)

      val holidayLengthInDays = 0 to ChronoUnit.DAYS.between(fromInclusive, toInclusive).toInt
      holidayLengthInDays.toList.collect { case day if isPublicationDay(day.toLong) => stoppedDate(day.toLong) }
    }
  }

}

case class ActionCalculatorError(message: String)