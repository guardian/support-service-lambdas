package com.gu.supporter.fulfilment

import java.time.DayOfWeek._
import java.time.format.TextStyle.FULL
import java.time.temporal.TemporalAdjusters.{next, nextOrSame}
import java.time.{DayOfWeek, LocalDate}
import java.util.Locale.ENGLISH

import com.gu.fulfilmentdates.FulfilmentDates

import scala.collection.immutable.ListMap

object VoucherBookletFulfilmentDates {

  lazy val VoucherHolidayStopNoticePeriodDays = 1
  lazy val FulfilmentCutoffDay = DayOfWeek.WEDNESDAY
  lazy val WeekStartDay = DayOfWeek.MONDAY

  def apply(today: LocalDate): ListMap[String, FulfilmentDates] =
    ListMap( // to preserve insertion order, so the file is easier to read
      List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY).map(targetDayOfWeek =>
        targetDayOfWeek.getDisplayName(FULL, ENGLISH) -> FulfilmentDates(
          today = today,
          holidayStopFirstAvailableDate = holidayStopFirstAvailableDate(today),
          holidayStopProcessorTargetDate = holidayStopProcessorTargetDate(targetDayOfWeek, today),
          newSubscriptionEarliestStartDate = newSubscriptionEarliestStartDate(targetDayOfWeek, today)
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
    //Subscriptions made today can be included in the the voucher fulfilment file generated on the next wednesday
    //morning the voucher book will be received in roughly two weeks after the fulfilment file is generated and
    //will contain vouchers that are valid for the week (starting monday) after they are received
    today `with` next(FulfilmentCutoffDay) plusWeeks (2) `with` next(WeekStartDay) `with` nextOrSame(issueDay)
  }
}
