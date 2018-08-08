package com.gu.newproduct.api.productcatalog

import java.time.DayOfWeek._
import java.time.LocalDate

import com.gu.newproduct.api.addsubscription.validation.{DaysOfWeekRule, Failed, Passed}
import org.scalatest.{FlatSpec, Matchers}

class DaysOfWeekRuleTest extends FlatSpec with Matchers {
  val mondayDate = LocalDate.of(2018, 8, 6)
  it should "fail if day of the week doesn't match rule" in {

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
}
