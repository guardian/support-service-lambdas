package com.gu.newproduct.api.productcatalog

import java.time.DayOfWeek.{TUESDAY, WEDNESDAY}
import java.time.LocalDate

import com.gu.newproduct.api.addsubscription.validation._
import org.scalatest.{FlatSpec, Matchers}

class StartDateRulesTest extends FlatSpec with Matchers {
  val IsWednesdayRule = DaysOfWeekRule(allowedDays = List(WEDNESDAY))

  def fakeNow = () => LocalDate.of(2018, 8, 6)

  val twoDayWindowAfterTuesday = WindowRule(
    now = fakeNow,
    maybeCutOffDay = Some(TUESDAY),
    maybeStartDelay = Some(Days(1)),
    maybeSize = Some(Days(2))
  )

  val startDateRules = StartDateRules(Some(IsWednesdayRule), Some(twoDayWindowAfterTuesday))

  it should "return error from window rule if both fail" in {
    val wednesdayAfterWindow = LocalDate.of(2018, 8, 15)
    startDateRules.isValid(wednesdayAfterWindow) shouldBe Failed("2018-08-15 is out of the selectable range: [2018-08-08 - 2018-08-10)")
  }

  it should "return return error from day of the week rule if it's the only one that fails" in {
    val thursdayInWindow = LocalDate.of(2018, 8, 9)
    startDateRules.isValid(thursdayInWindow) shouldBe Failed("invalid day of the week: 2018-08-09 is a THURSDAY. Allowed days are WEDNESDAY")

  }
}
