package com.gu.holidaystopbackfill

import java.time.LocalDate

import org.scalacheck.Prop.{BooleanOperators, forAll}
import org.scalacheck.{Arbitrary, Gen, Properties}

object SalesforceHolidayStopTest extends Properties("SalesforceHolidayStop") {

  implicit val arbLocalDate: Arbitrary[LocalDate] = Arbitrary {
    for {
      epochDay <- Gen.choose(
        LocalDate.now.minusYears(2).toEpochDay,
        LocalDate.now.plusYears(2).toEpochDay
      )
    } yield LocalDate.ofEpochDay(epochDay)
  }

  property("applicableDates") = forAll { (d1: LocalDate, d2: LocalDate) =>
    (d1.isEqual(d2) || d1.isBefore(d2)) ==> {
      val result = SalesforceHolidayStop.applicableDates(d1, d2, { _ => true })
      result.head == d1 && result.last == d2
    }
  }
}
