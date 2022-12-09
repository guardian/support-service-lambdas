package com.gu.newproduct.api.addsubscription.validation

import java.time.LocalDate
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class WindowValidatorTest extends AnyFlatSpec with Matchers {

  val august6 = LocalDate.of(2018, 8, 6)
  val august26 = LocalDate.of(2018, 8, 26)
  val august6To26Window = SelectableWindow(start = august6, maybeEndExclusive = Some(august26))

  "WindowValidator" should "return correct error message if validation fails" in {
    val outOfWindowDate = august6To26Window.start.minusDays(1)

    WindowValidator(
      selectableWindow = august6To26Window,
      dateToValidate = outOfWindowDate,
    ) shouldBe Failed("2018-08-05 is out of the selectable range: [2018-08-06 - 2018-08-26)")
  }

  it should "return passed with date in window" in {
    val dateInWindow = august6To26Window.start.plusDays(1)

    WindowValidator(
      selectableWindow = august6To26Window,
      dateToValidate = dateInWindow,
    ) shouldBe Passed(())
  }
}
