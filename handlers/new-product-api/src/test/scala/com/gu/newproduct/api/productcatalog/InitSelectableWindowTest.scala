package com.gu.newproduct.api.productcatalog

import java.time.DayOfWeek._
import java.time.LocalDate

import com.gu.newproduct.api.addsubscription.validation._
import org.scalatest.{FlatSpec, Matchers}

class InitSelectableWindowTest extends FlatSpec with Matchers {

  val wednesdayAugust8 = LocalDate.of(2018, 8, 8)

  def getWedAugust8 = () => wednesdayAugust8

  "SelectableWindow" should "define an unbounded window starting today if no params are defined" in {
    val window = SelectableWindow(
      now = getWedAugust8,
      WindowRule(
        maybeCutOffDay = None,
        maybeStartDelay = None,
        maybeSize = None
      )
    )

    window shouldBe SelectableWindow(wednesdayAugust8, None)
  }

  "windowRule" should "define an unbounded window starting tomorrow if tomorrow is the cut off day and there are no other parameters defined " in {
    val window = SelectableWindow(
      now = getWedAugust8,
      WindowRule(
        maybeCutOffDay = Some(THURSDAY),
        maybeStartDelay = None,
        maybeSize = None
      )
    )

    window shouldBe SelectableWindow(LocalDate.of(2018, 8, 9), None)
  }

  it should "define an unbounded window starting cut off day next week if the cut off date was yesterday" in {
    val window = SelectableWindow(
      now = getWedAugust8,
      WindowRule(
        maybeCutOffDay = Some(TUESDAY),
        maybeStartDelay = None,
        maybeSize = None
      )
    )

    window shouldBe SelectableWindow(LocalDate.of(2018, 8, 14), None)
  }

  it should "define an unbounded window starting in two days if only the start delay is set to 2" in {
    val window = SelectableWindow(
      now = getWedAugust8,
      WindowRule(
        maybeCutOffDay = None,
        maybeStartDelay = Some(DelayDays(2)),
        maybeSize = None
      )
    )

    window shouldBe SelectableWindow(wednesdayAugust8.plusDays(2), None)
  }

  it should "define a 2 day window starting today if only the window size is set to 2 days" in {
    val window = SelectableWindow(
      now = getWedAugust8,
      WindowRule(
        maybeCutOffDay = None,
        maybeStartDelay = None,
        maybeSize = Some(WindowSizeDays(2))
      )
    )
    window shouldBe SelectableWindow(wednesdayAugust8, Some(wednesdayAugust8.plusDays(2)))
  }

  it should "define a 2 day window starting next week 3 days after cut off date" in {
    val window = SelectableWindow(
      now = getWedAugust8,
      WindowRule(
        maybeCutOffDay = Some(MONDAY),
        maybeStartDelay = Some(DelayDays(3)),
        maybeSize = Some(WindowSizeDays(2))
      )
    )
    val mondayNextWeek = LocalDate.of(2018, 8, 13)
    val expectedWindowStart = mondayNextWeek.plusDays(3)
    val expectedWindowEnd = expectedWindowStart.plusDays(2)
    window shouldBe SelectableWindow(expectedWindowStart, Some(expectedWindowEnd))
  }
}
