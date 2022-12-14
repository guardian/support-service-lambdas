package com.gu.newproduct.api.addsubscription.validation

import java.time.DayOfWeek._
import java.time.LocalDate

import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class DaysOfWeekValidatorTest extends AnyFlatSpec with Matchers {
  val mondayDate = LocalDate.of(2018, 8, 6)
  it should "fail if day of the week doesn't match rule" in {

    val actualValidationResponse = DayOfWeekValidator(
      allowedDays = List(TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY),
      dateToValidate = mondayDate,
    )

    val expectedMsg =
      "invalid day of the week: 2018-08-06 is a MONDAY. Allowed days are TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY,SUNDAY"
    actualValidationResponse shouldBe Failed(expectedMsg)
  }
  it should "succeed if day matches rules" in {
    val actualValidationResponse = DayOfWeekValidator(allowedDays = List(MONDAY), dateToValidate = mondayDate)

    actualValidationResponse shouldBe Passed(())
  }
}
