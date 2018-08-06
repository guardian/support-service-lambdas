package com.gu.newproduct.api.productcatalog

import java.time.{DayOfWeek, LocalDate}
import java.time.DayOfWeek._

import com.gu.newproduct.api.addsubscription.validation.{Failed, Passed}
import org.scalatest.{FlatSpec, Matchers}

class StartDateValidationTest extends FlatSpec with Matchers {
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

  "WindowRule" should "fail if startDate is cutOff day (should pick next week)" in {
    val mondayCutOff = windowRule(cutOffDay = Some(MONDAY))
    mondayCutOff.isValid(mondayDate) shouldBe Failed("2018-08-06 is out of the selectable range: [2018-08-13 - ]")
  }

  it should "fail if startDate is startdate is too soon after cut off day" in {
    val mondayCutOff = windowRule(cutOffDay = Some(MONDAY), startDelay = Some(Days(4)))
    mondayCutOff.isValid(mondayDate) shouldBe Failed("2018-08-06 is out of the selectable range: [2018-08-17 - ]")
  }

  it should "fail if startDate is startdate is after selectable window" in {
    val mondayCutOff = windowRule(cutOffDay = Some(TUESDAY), startDelay = Some(Days(1)), size = Some(Days(2)))
    val nextMonday = LocalDate.of(2018, 8, 13)
    mondayCutOff.isValid(nextMonday) shouldBe Failed("2018-08-13 is out of the selectable range: [2018-08-08 - 2018-08-09]")
  }

  it should "fail if startDate is startdate is in the past" in {
    val mondayCutOff = windowRule(cutOffDay = Some(TUESDAY), startDelay = Some(Days(1)), size = Some(Days(2)))
    val lastMonday = LocalDate.of(2018, 7, 30)
    mondayCutOff.isValid(lastMonday) shouldBe Failed("2018-07-30 is out of the selectable range: [2018-08-08 - 2018-08-09]")
  }

  it should "succeed if date  is last day of window" in {
    val mondayCutOff = windowRule(cutOffDay = Some(TUESDAY), startDelay = Some(Days(1)), size = Some(Days(2)))
    val validDate = LocalDate.of(2018, 8, 9)
    mondayCutOff.isValid(validDate) shouldBe Passed(())
  }

  it should "succeed if date  is first day of window" in {
    val mondayCutOff = windowRule(cutOffDay = Some(TUESDAY), startDelay = Some(Days(1)), size = Some(Days(2)))
    val validDate = LocalDate.of(2018, 8, 8)
    mondayCutOff.isValid(validDate) shouldBe Passed(())
  }
}
