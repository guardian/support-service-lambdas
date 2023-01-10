package com.gu.supporter.fulfilment

import java.time.LocalDate

import org.scalatest.matchers.{MatchResult, Matcher}

trait DateSupport {
  implicit def stringToLocalDate(s: String) = LocalDate.parse(s)

  def equalDate(right: LocalDate): Matcher[LocalDate] =
    (left: LocalDate) =>
      MatchResult(
        right equals left,
        s"actual $left is not equal to expected $right",
        s"actual $left is equal to expected $right",
      )
}
