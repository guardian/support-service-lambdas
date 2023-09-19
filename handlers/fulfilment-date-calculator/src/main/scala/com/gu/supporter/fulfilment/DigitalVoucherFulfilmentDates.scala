package com.gu.supporter.fulfilment

import java.time.DayOfWeek._
import java.time.format.TextStyle.FULL
import java.time.temporal.TemporalAdjusters.{next, nextOrSame}
import java.time.{DayOfWeek, LocalDate}
import java.util.Locale.ENGLISH

import cats.data.NonEmptyList
import com.gu.fulfilmentdates.FulfilmentDates

import scala.collection.immutable.ListMap

object DigitalVoucherFulfilmentDates {

  private final val VoucherHolidayStopNoticePeriodDays: Long = 2
  private final val FulfilmentCutoffDays: NonEmptyList[DayOfWeek] =
    NonEmptyList.of(DayOfWeek.MONDAY, DayOfWeek.THURSDAY)

  def apply(today: LocalDate): ListMap[String, FulfilmentDates] =
    ListMap( // to preserve insertion order, so the file is easier to read
      List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY).map(targetDayOfWeek =>
        targetDayOfWeek.getDisplayName(FULL, ENGLISH) -> FulfilmentDates(
          today = today,
          holidayStopFirstAvailableDate = holidayStopFirstAvailableDate(today),
          holidayStopProcessorTargetDate = holidayStopProcessorTargetDate(targetDayOfWeek, today),
          newSubscriptionEarliestStartDate = newSubscriptionEarliestStartDate(targetDayOfWeek, today),
        ),
      ): _*,
    )

  private def holidayStopFirstAvailableDate(today: LocalDate): LocalDate =
    today plusDays VoucherHolidayStopNoticePeriodDays

  private def holidayStopProcessorTargetDate(targetDayOfWeek: DayOfWeek, today: LocalDate): Option[LocalDate] =
    /*
     * We process voucher holiday stops the day before they're scheduled
     * to ensure they are disabled on the suspension date
     */
    Option.when(today.getDayOfWeek == targetDayOfWeek)(today.plusDays(1))

  private def newSubscriptionEarliestStartDate(issueDay: DayOfWeek, today: LocalDate): LocalDate = {
    // Fulfilment files are generated on Mondays and Thursdays
    // There is a delay of up to 7 days for the voucher cards to be printed and sent to the customer
    // The earliest start date will be the issue day on or after that date
    val soonestFulfilmentFileDate =
      soonest(
        FulfilmentCutoffDays.map(fulfilmentCutoffDay => today `with` next(fulfilmentCutoffDay)),
      )

    soonestFulfilmentFileDate plusDays 7 `with` nextOrSame(issueDay)
  }

  private def soonest(dates: NonEmptyList[LocalDate]): LocalDate =
    dates.toList.min[LocalDate](_ compareTo _)
}
