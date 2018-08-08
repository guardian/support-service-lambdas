package com.gu.newproduct.api.productcatalog

import java.time.{DayOfWeek, LocalDate}
import java.time.DayOfWeek._
import com.gu.newproduct.api.addsubscription.validation._
import org.scalatest.{FlatSpec, Matchers}

class DateValidationTest extends FlatSpec with Matchers {
  val mondayDate = LocalDate.of(2018, 8, 6)
  "DaysOfWeekRule" should "fail if day of the week doesn't match rule" in {

    val notMondayRule = DaysOfWeekRule(allowedDays = List(
      TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY
    ))

    val expectedMsg = "invalid day of the week: 2018-08-06 is a MONDAY. Allowed days are TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY,SUNDAY"
    notMondayRule.isValid(mondayDate) shouldBe Failed(expectedMsg)
  }
  it should "succeed if day matches rules" in {
    val isMondayRule = DaysOfWeekRule(allowedDays = List(MONDAY))

    isMondayRule.isValid(mondayDate) shouldBe Passed(())
  }

  def windowRule(cutOffDay: Option[DayOfWeek] = None, startDelay: Option[Days] = None, size: Option[Days] = None) = {
    val fakeNow = () => LocalDate.of(2018, 8, 6)
    WindowRule(fakeNow, cutOffDay, startDelay, size)
  }

  "WindowRule" should "succeed if startDate is cutOff day and delay is 0" in {
    val mondayCutOff = windowRule(cutOffDay = Some(MONDAY))
    mondayCutOff.isValid(mondayDate) shouldBe Passed(())
  }

  it should "fail if startDate is startdate is too soon after cut off day" in {
    val mondayCutOff = windowRule(cutOffDay = Some(MONDAY), startDelay = Some(Days(4)))
    mondayCutOff.isValid(mondayDate) shouldBe Failed("2018-08-06 is out of the selectable range: [2018-08-10 - )")
  }

  it should "fail if startDate  is in the past" in {
    val mondayCutOff = windowRule(cutOffDay = Some(TUESDAY), startDelay = Some(Days(1)), size = Some(Days(2)))
    val lastMonday = LocalDate.of(2018, 7, 30)
    mondayCutOff.isValid(lastMonday) shouldBe Failed("2018-07-30 is out of the selectable range: [2018-08-08 - 2018-08-10)")
  }

  it should "pass if startDate is startdate is in the past" in {
    val mondayCutOff = windowRule(cutOffDay = Some(TUESDAY), startDelay = Some(Days(1)), size = Some(Days(2)))
    val lastMonday = LocalDate.of(2018, 7, 30)
    mondayCutOff.isValid(lastMonday) shouldBe Failed("2018-07-30 is out of the selectable range: [2018-08-08 - 2018-08-10)")
  }

  it should "fail if date is the day after the window ends" in {
    val mondayCutOff = windowRule(cutOffDay = Some(TUESDAY), startDelay = Some(Days(1)), size = Some(Days(2)))
    val lastDayOfWindow = LocalDate.of(2018, 8, 10)
    mondayCutOff.isValid(lastDayOfWindow) shouldBe Failed("2018-08-10 is out of the selectable range: [2018-08-08 - 2018-08-10)")
  }

  it should "pass if startDate is the last day of the window" in {
    val mondayCutOff = windowRule(cutOffDay = Some(TUESDAY), startDelay = Some(Days(1)), size = Some(Days(2)))
    val lastDayOfWindow = LocalDate.of(2018, 8, 9)
    mondayCutOff.isValid(lastDayOfWindow) shouldBe Passed(())
  }

  it should "succeed if date  is first day of window" in {
    val mondayCutOff = windowRule(cutOffDay = Some(TUESDAY), startDelay = Some(Days(1)), size = Some(Days(2)))
    val validDate = LocalDate.of(2018, 8, 8)
    mondayCutOff.isValid(validDate) shouldBe Passed(())
  }

  val IsWednesdayRule = DaysOfWeekRule(allowedDays = List(WEDNESDAY))
  val twoDayWindowAfterTuesday = windowRule(cutOffDay = Some(TUESDAY), startDelay = Some(Days(1)), size = Some(Days(2)))
  val startDateRules = StartDateRules(Some(IsWednesdayRule), Some(twoDayWindowAfterTuesday))

  "StartDateValidation" should "return error from window rule if both fail" in {
    val wednesdayAfterWindow = LocalDate.of(2018, 8, 15)
    startDateRules.isValid(wednesdayAfterWindow) shouldBe Failed("2018-08-15 is out of the selectable range: [2018-08-08 - 2018-08-10)")
  }

  it should "return return error from day of the week rule if it's the only one that fails" in {
    val thursdayInWindow = LocalDate.of(2018, 8, 9)
    startDateRules.isValid(thursdayInWindow) shouldBe Failed("invalid day of the week: 2018-08-09 is a THURSDAY. Allowed days are WEDNESDAY")


  }
}
