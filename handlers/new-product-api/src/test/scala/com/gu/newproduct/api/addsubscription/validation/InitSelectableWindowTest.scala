package com.gu.newproduct.api.addsubscription.validation

import java.time.DayOfWeek._
import java.time.LocalDate

import com.gu.newproduct.api.productcatalog.{WindowRule, WindowSizeDays}
import org.scalatest.{FlatSpec, Matchers}

class InitSelectableWindowTest extends FlatSpec with Matchers {

  val wednesdayAugust8 = LocalDate.of(2018, 8, 8)

  def getWedAugust8 = () => wednesdayAugust8

  "SelectableWindow" should "define an unbounded window " in {
    val window = SelectableWindow(
      now = getWedAugust8,
      WindowRule(
        startDate = wednesdayAugust8,
        maybeCutOffDay = None,
        maybeStartDelay = None,
        maybeSize = None
      )
    )

    window shouldBe SelectableWindow(wednesdayAugust8, None)
  }

  "windowRule" should "define bounded window" in {
    val window = SelectableWindow(
      now = getWedAugust8,
      WindowRule(
        startDate = wednesdayAugust8,
        maybeCutOffDay = Some(THURSDAY),
        maybeStartDelay = None,
        maybeSize = Some(WindowSizeDays(10))
      )
    )

    window shouldBe SelectableWindow(wednesdayAugust8, Some(wednesdayAugust8.plusDays(10)))
  }
}
