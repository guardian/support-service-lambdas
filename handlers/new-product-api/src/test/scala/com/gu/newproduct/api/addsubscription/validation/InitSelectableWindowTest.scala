package com.gu.newproduct.api.addsubscription.validation

import java.time.LocalDate

import com.gu.newproduct.api.productcatalog.{WindowRule, WindowSizeDays}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class InitSelectableWindowTest extends AnyFlatSpec with Matchers {

  val wednesdayAugust8 = LocalDate.of(2018, 8, 8)

  def getWedAugust8 = () => wednesdayAugust8

  "SelectableWindow" should "define an unbounded window " in {
    val window = SelectableWindow(
      now = getWedAugust8,
      WindowRule(
        startDate = wednesdayAugust8,
        maybeSize = None,
      ),
    )

    window shouldBe SelectableWindow(wednesdayAugust8, None)
  }

  "windowRule" should "define bounded window" in {
    val window = SelectableWindow(
      now = getWedAugust8,
      WindowRule(
        startDate = wednesdayAugust8,
        maybeSize = Some(WindowSizeDays(10)),
      ),
    )

    window shouldBe SelectableWindow(wednesdayAugust8, Some(wednesdayAugust8.plusDays(10)))
  }
}
