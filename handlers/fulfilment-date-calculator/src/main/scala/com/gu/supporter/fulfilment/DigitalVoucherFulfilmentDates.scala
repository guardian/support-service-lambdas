package com.gu.supporter.fulfilment

import java.time.DayOfWeek._
import java.time.format.TextStyle.FULL
import java.time.temporal.TemporalAdjusters.{next, nextOrSame}
import java.time.{DayOfWeek, LocalDate}
import java.util.Locale.ENGLISH

import com.gu.fulfilmentdates.FulfilmentDates

import scala.collection.immutable.ListMap

object DigitalVoucherFulfilmentDates {

  lazy val VoucherHolidayStopNoticePeriodDays = 1
  lazy val FulfilmentCutoffDays = List(DayOfWeek.MONDAY, DayOfWeek.THURSDAY)
  lazy val WeekStartDay = DayOfWeek.MONDAY

  def apply(today: LocalDate): ListMap[String, FulfilmentDates] =
    ListMap( // to preserve insertion order, so the file is easier to read
      List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY).map(targetDayOfWeek =>
        targetDayOfWeek.getDisplayName(FULL, ENGLISH) -> FulfilmentDates(
          today,
          holidayStopFirstAvailableDate(today),
          holidayStopProcessorTargetDate(targetDayOfWeek, today),
          newSubscriptionEarliestStartDate(targetDayOfWeek, today)
        )): _*
    )

  def holidayStopFirstAvailableDate(today: LocalDate): LocalDate = today plusDays VoucherHolidayStopNoticePeriodDays

  def holidayStopProcessorTargetDate(targetDayOfWeek: DayOfWeek, today: LocalDate): Option[LocalDate] = {
    if (today.getDayOfWeek == targetDayOfWeek) {
      Some(today) // we process voucher holiday stops on the day they're scheduled for
    } else {
      None
    }
  }

  def newSubscriptionEarliestStartDate(issueDay: DayOfWeek, today: LocalDate) = {
    //Fulfilment files are generated on Mondays and Thursdays
    //There is a delay of up to 7 days for the voucher cards to be printed and sent to the customer
    //The earliest start date will be the issue day on or after that date
    val soonestFulfilmentFileDate =
      soonest(FulfilmentCutoffDays.map(fulfilmentCutoffDay => today `with` next(fulfilmentCutoffDay)))

    soonestFulfilmentFileDate plusDays (7) `with` nextOrSame(issueDay)
  }

  def soonest(dates: List[LocalDate]) = dates.min[LocalDate](_ compareTo _)
}
