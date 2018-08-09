package com.gu.newproduct.api.productcatalog

import java.time.LocalDate
import com.gu.newproduct.api.addsubscription.validation._
import org.scalatest.{FlatSpec, Matchers}

class SelectableWindowContainsTest extends FlatSpec with Matchers {

  val august6 = LocalDate.of(2018, 8, 6)
  val august26 = LocalDate.of(2018, 8, 26)
  val august6To26Window = SelectableWindow(start = august6, maybeEndExclusive = Some(august26))

  "SelectableWindow" should "not contain the day before the window starts" in {
    august6To26Window.contains(LocalDate.of(2018, 8, 5)) shouldBe (false)
  }

  it should "not contain the exclusive upper limit of the window" in {
    august6To26Window.contains(LocalDate.of(2018, 8, 26)) shouldBe (false)
  }

  it should "contain the first day of the window" in {
    august6To26Window.contains(LocalDate.of(2018, 8, 6)) shouldBe (true)
  }

  it should "contain the last day of the window" in {
    august6To26Window.contains(LocalDate.of(2018, 8, 25)) shouldBe (true)
  }

  it should "contain a date five years in the future if there is no upper limit defined" in {
    val noUpperBoundWindow = SelectableWindow(start = august6, maybeEndExclusive = None)

    noUpperBoundWindow.contains(august6.plusYears(5))
  }

}
