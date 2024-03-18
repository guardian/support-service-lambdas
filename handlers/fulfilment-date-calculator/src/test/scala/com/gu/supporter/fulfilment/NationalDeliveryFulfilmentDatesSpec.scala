package com.gu.supporter.fulfilment

import com.gu.fulfilmentdates.FulfilmentDates
import org.scalatest.Assertion
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import java.time.LocalDate
import java.time.format.DateTimeFormatter

/** useful for debugging, run to show dates in the console
  */
object TestPrintDates {

  import NationalDeliveryFulfilmentDatesSpec._

  def main(args: Array[String]): Unit = {
    println("holidayStopProcessorTargetDate")
    printDates(_.holidayStopProcessorTargetDate.getOrElse(LocalDate.of(1900, 1, 1)))
    println("deliveryAddressChangeEffectiveDate")
    printDates(_.deliveryAddressChangeEffectiveDate.getOrElse(LocalDate.of(1900, 1, 1)))
  }

  private def printDates(dateToPrint: FulfilmentDates => LocalDate): Unit = {
    List(monday___, tuesday__, wednesday, thursday_, friday___, saturday_, sunday___).foreach { day =>
      val hsp = NationalDeliveryFulfilmentDates(day, makeBankHolidays())
        .map { case (k, v) => (k, dateDebug(dateToPrint(v))) }
        .mkString("\n  ")
      println(dateDebug(day) + ":\n  " + hsp)
    }
  }

}

object NationalDeliveryFulfilmentDatesSpec extends DateSupport {

  val monday___ = "2019-12-02"
  val tuesday__ = "2019-12-03"
  val wednesday = "2019-12-04"
  val thursday_ = "2019-12-05"
  val friday___ = "2019-12-06"
  val saturday_ = "2019-12-07"
  val sunday___ = "2019-12-08"

  private val monday___Next = "2019-12-09"
  private val tuesday__Next = "2019-12-10"
  private val wednesdayNext = "2019-12-11"
  private val thursday_Next = "2019-12-12"
  private val friday___Next = "2019-12-13"
  private val saturday_Next = "2019-12-14"
  private val sunday___Next = "2019-12-15"

  private val monday___NextNext = "2019-12-16"
  private val tuesday__NextNext = "2019-12-17"
  private val wednesdayNextNext = "2019-12-18"
  private val thursday_NextNext = "2019-12-19"
  private val friday___NextNext = "2019-12-20"
  private val saturday_NextNext = "2019-12-21"
  private val sunday___NextNext = "2019-12-22"

  private val monday___NextNextNext = "2019-12-23"
  private val tuesday__NextNextNext = "2019-12-24"
  private val wednesdayNextNextNext = "2019-12-25"
  private val thursday_NextNextNext = "2019-12-26"
  private val friday___NextNextNext = "2019-12-27"
  private val saturday_NextNextNext = "2019-12-28"
  private val sunday___NextNextNext = "2019-12-29"

  def makeBankHolidays(dates: String*): BankHolidays = BankHolidays(
    dates.map((Event.apply _).compose(LocalDate.parse)).toList,
  )

  def dateDebug(localDate: LocalDate): String =
    localDate.format(DateTimeFormatter.ofPattern("E d"))

}

class NationalDeliveryFulfilmentDatesSpec extends AnyFlatSpec with Matchers with DateSupport {

  import NationalDeliveryFulfilmentDatesSpec._

  "NationalDeliveryFulfilmentDates" should "should contain correct holidayStopProcessorTargetDate(s) for a normal week" in {

    // reflective calls are useful to make the syntax of shouldProcessHolidayStopsFor varargs neater
    import scala.language.reflectiveCalls

    def on(today: String, bankHolidays: BankHolidays = makeBankHolidays()) = new {
      def shouldProcessHolidayStopsFor(expected: LocalDate*): Assertion = {
        withClue("checking stops for " + dateDebug(today) + ": ") {
          NationalDeliveryFulfilmentDates(today, bankHolidays).values
            .flatMap(_.holidayStopProcessorTargetDate)
            .toList
            .sorted shouldBe expected.toList
        }
      }
    }
    def easterWeekend = on(_, makeBankHolidays(friday___, monday___Next))

    on(wednesday).shouldProcessHolidayStopsFor(friday___)
    on(thursday_).shouldProcessHolidayStopsFor(saturday_, sunday___, monday___Next)
    on(friday___).shouldProcessHolidayStopsFor(tuesday__Next)
    on(saturday_).shouldProcessHolidayStopsFor()
    on(sunday___).shouldProcessHolidayStopsFor()
    on(monday___Next).shouldProcessHolidayStopsFor(wednesdayNext)
    on(tuesday__Next).shouldProcessHolidayStopsFor(thursday_Next)
    on(wednesdayNext).shouldProcessHolidayStopsFor(friday___Next)
    on(thursday_Next).shouldProcessHolidayStopsFor(saturday_Next, sunday___Next, monday___NextNext)
    on(friday___Next).shouldProcessHolidayStopsFor(tuesday__NextNext)
    on(saturday_Next).shouldProcessHolidayStopsFor()
    on(sunday___Next).shouldProcessHolidayStopsFor()

    withClue("EASTER: ") {
      easterWeekend(wednesday).shouldProcessHolidayStopsFor(
        friday___,
        saturday_,
        sunday___,
        monday___Next,
        tuesday__Next,
      )
      easterWeekend(thursday_).shouldProcessHolidayStopsFor(wednesdayNext)
      easterWeekend(friday___).shouldProcessHolidayStopsFor()
      easterWeekend(saturday_).shouldProcessHolidayStopsFor()
      easterWeekend(sunday___).shouldProcessHolidayStopsFor()
      easterWeekend(monday___Next).shouldProcessHolidayStopsFor()
      easterWeekend(tuesday__Next).shouldProcessHolidayStopsFor(thursday_Next)
    }
  }

  private def assertEffectiveDates(
      today: LocalDate,
      paperDay: String,
      expectedEffectiveCoverDate: LocalDate,
      bankHolidays: BankHolidays = makeBankHolidays(),
  ) =
    withClue("effective date for " + dateDebug(today) + s" for $paperDay's issue: ") {
      val datesForTodayPaperDay = NationalDeliveryFulfilmentDates(today, bankHolidays)(paperDay)
      withClue("holidayStopFirstAvailableDate") {
        datesForTodayPaperDay.holidayStopFirstAvailableDate should equalDate(expectedEffectiveCoverDate)
      }
      withClue("deliveryAddressChangeEffectiveDate") {
        datesForTodayPaperDay.deliveryAddressChangeEffectiveDate.get should equalDate(expectedEffectiveCoverDate)
      }
      withClue("newSubscriptionEarliestStartDate") {
        datesForTodayPaperDay.newSubscriptionEarliestStartDate should equalDate(expectedEffectiveCoverDate)
      }
    }

  "MONDAY" should "have correct effective dates" in {
    assertEffectiveDates(today = wednesday, paperDay = "Monday", expectedEffectiveCoverDate = monday___Next)
    assertEffectiveDates(today = thursday_, paperDay = "Monday", expectedEffectiveCoverDate = monday___NextNext)
    assertEffectiveDates(today = wednesdayNext, paperDay = "Monday", expectedEffectiveCoverDate = monday___NextNext)
    assertEffectiveDates(today = thursday_Next, paperDay = "Monday", expectedEffectiveCoverDate = monday___NextNextNext)
  }

  "TUESDAY" should "have correct effective dates" in {
    assertEffectiveDates(today = thursday_, paperDay = "Tuesday", expectedEffectiveCoverDate = tuesday__Next)
    assertEffectiveDates(today = friday___, paperDay = "Tuesday", expectedEffectiveCoverDate = tuesday__NextNext)
    assertEffectiveDates(today = thursday_Next, paperDay = "Tuesday", expectedEffectiveCoverDate = tuesday__NextNext)
    assertEffectiveDates(
      today = friday___Next,
      paperDay = "Tuesday",
      expectedEffectiveCoverDate = tuesday__NextNextNext,
    )
  }

  "WEDNESDAY" should "have correct effective dates" in {
    assertEffectiveDates(today = sunday___, paperDay = "Wednesday", expectedEffectiveCoverDate = wednesdayNext)
    assertEffectiveDates(today = monday___Next, paperDay = "Wednesday", expectedEffectiveCoverDate = wednesdayNextNext)
    assertEffectiveDates(today = sunday___Next, paperDay = "Wednesday", expectedEffectiveCoverDate = wednesdayNextNext)
    assertEffectiveDates(
      today = monday___NextNext,
      paperDay = "Wednesday",
      expectedEffectiveCoverDate = wednesdayNextNextNext,
    )
  }

  "THURSDAY" should "have correct effective dates" in {
    assertEffectiveDates(today = monday___Next, paperDay = "Thursday", expectedEffectiveCoverDate = thursday_Next)
    assertEffectiveDates(today = tuesday__Next, paperDay = "Thursday", expectedEffectiveCoverDate = thursday_NextNext)
    assertEffectiveDates(
      today = monday___NextNext,
      paperDay = "Thursday",
      expectedEffectiveCoverDate = thursday_NextNext,
    )
    assertEffectiveDates(
      today = tuesday__NextNext,
      paperDay = "Thursday",
      expectedEffectiveCoverDate = thursday_NextNextNext,
    )
  }

  "FRIDAY" should "have correct effective dates" in {
    assertEffectiveDates(today = tuesday__Next, paperDay = "Friday", expectedEffectiveCoverDate = friday___Next)
    assertEffectiveDates(today = wednesdayNext, paperDay = "Friday", expectedEffectiveCoverDate = friday___NextNext)
    assertEffectiveDates(today = tuesday__NextNext, paperDay = "Friday", expectedEffectiveCoverDate = friday___NextNext)
    assertEffectiveDates(
      today = wednesdayNextNext,
      paperDay = "Friday",
      expectedEffectiveCoverDate = friday___NextNextNext,
    )
  }

  "SATURDAY" should "have correct effective dates" in {
    assertEffectiveDates(today = wednesdayNext, paperDay = "Saturday", expectedEffectiveCoverDate = saturday_Next)
    assertEffectiveDates(today = thursday_Next, paperDay = "Saturday", expectedEffectiveCoverDate = saturday_NextNext)
    assertEffectiveDates(
      today = wednesdayNextNext,
      paperDay = "Saturday",
      expectedEffectiveCoverDate = saturday_NextNext,
    )
    assertEffectiveDates(
      today = thursday_NextNext,
      paperDay = "Saturday",
      expectedEffectiveCoverDate = saturday_NextNextNext,
    )
  }

  "SUNDAY" should "have correct effective dates" in {
    assertEffectiveDates(today = wednesdayNext, paperDay = "Sunday", expectedEffectiveCoverDate = sunday___Next)
    assertEffectiveDates(today = thursday_Next, paperDay = "Sunday", expectedEffectiveCoverDate = sunday___NextNext)
    assertEffectiveDates(today = wednesdayNextNext, paperDay = "Sunday", expectedEffectiveCoverDate = sunday___NextNext)
    assertEffectiveDates(
      today = thursday_NextNext,
      paperDay = "Sunday",
      expectedEffectiveCoverDate = sunday___NextNextNext,
    )
  }

  private def assertOnEasterWeekend(today: LocalDate, paperDay: String, expectedEffectiveCoverDate: LocalDate) =
    assertEffectiveDates(today, paperDay, expectedEffectiveCoverDate, makeBankHolidays(friday___, monday___Next))

  "FRIDAY around easter week" should "have correct effective dates" in {
    assertOnEasterWeekend(today = tuesday__, paperDay = "Friday", expectedEffectiveCoverDate = friday___)
    assertOnEasterWeekend(today = wednesday, paperDay = "Friday", expectedEffectiveCoverDate = friday___Next)
    assertOnEasterWeekend(today = tuesday__Next, paperDay = "Friday", expectedEffectiveCoverDate = friday___Next)
    assertOnEasterWeekend(today = wednesdayNext, paperDay = "Friday", expectedEffectiveCoverDate = friday___NextNext)
  }

  "SATURDAY around easter week" should "have correct effective dates" in {
    assertOnEasterWeekend(today = tuesday__, paperDay = "Saturday", expectedEffectiveCoverDate = saturday_)
    assertOnEasterWeekend(today = wednesday, paperDay = "Saturday", expectedEffectiveCoverDate = saturday_Next)
    assertOnEasterWeekend(today = wednesdayNext, paperDay = "Saturday", expectedEffectiveCoverDate = saturday_Next)
    assertOnEasterWeekend(today = thursday_Next, paperDay = "Saturday", expectedEffectiveCoverDate = saturday_NextNext)
  }

  "SUNDAY around easter week" should "have correct effective dates" in {
    assertOnEasterWeekend(today = tuesday__, paperDay = "Sunday", expectedEffectiveCoverDate = sunday___)
    assertOnEasterWeekend(today = wednesday, paperDay = "Sunday", expectedEffectiveCoverDate = sunday___Next)
    assertOnEasterWeekend(today = wednesdayNext, paperDay = "Sunday", expectedEffectiveCoverDate = sunday___Next)
    assertOnEasterWeekend(today = thursday_Next, paperDay = "Sunday", expectedEffectiveCoverDate = sunday___NextNext)
  }

  "MONDAY around easter week" should "have correct effective dates" in {
    assertOnEasterWeekend(today = tuesday__, paperDay = "Monday", expectedEffectiveCoverDate = monday___Next)
    assertOnEasterWeekend(today = wednesday, paperDay = "Monday", expectedEffectiveCoverDate = monday___NextNext)
    assertOnEasterWeekend(today = wednesdayNext, paperDay = "Monday", expectedEffectiveCoverDate = monday___NextNext)
    assertOnEasterWeekend(
      today = thursday_Next,
      paperDay = "Monday",
      expectedEffectiveCoverDate = monday___NextNextNext,
    )
  }

  "TUESDAY around easter week" should "have correct effective dates" in {
    assertOnEasterWeekend(today = tuesday__, paperDay = "Tuesday", expectedEffectiveCoverDate = tuesday__Next)
    assertOnEasterWeekend(today = wednesday, paperDay = "Tuesday", expectedEffectiveCoverDate = tuesday__NextNext)
    assertOnEasterWeekend(today = thursday_Next, paperDay = "Tuesday", expectedEffectiveCoverDate = tuesday__NextNext)
    assertOnEasterWeekend(
      today = friday___Next,
      paperDay = "Tuesday",
      expectedEffectiveCoverDate = tuesday__NextNextNext,
    )
  }

  "WEDNESDAY around easter week" should "have correct effective dates" in {
    assertOnEasterWeekend(today = wednesday, paperDay = "Wednesday", expectedEffectiveCoverDate = wednesdayNext)
    assertOnEasterWeekend(today = thursday_, paperDay = "Wednesday", expectedEffectiveCoverDate = wednesdayNextNext)
    assertOnEasterWeekend(today = sunday___Next, paperDay = "Wednesday", expectedEffectiveCoverDate = wednesdayNextNext)
    assertOnEasterWeekend(
      today = monday___NextNext,
      paperDay = "Wednesday",
      expectedEffectiveCoverDate = wednesdayNextNextNext,
    )
  }

  "THURSDAY around easter week" should "have correct effective dates" in {
    assertOnEasterWeekend(today = monday___Next, paperDay = "Thursday", expectedEffectiveCoverDate = thursday_Next)
    assertOnEasterWeekend(today = tuesday__Next, paperDay = "Thursday", expectedEffectiveCoverDate = thursday_NextNext)
    assertOnEasterWeekend(
      today = monday___NextNext,
      paperDay = "Thursday",
      expectedEffectiveCoverDate = thursday_NextNext,
    )
    assertOnEasterWeekend(
      today = tuesday__NextNext,
      paperDay = "Thursday",
      expectedEffectiveCoverDate = thursday_NextNextNext,
    )
  }

}
