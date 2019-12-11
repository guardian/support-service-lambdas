package com.gu.supporter.fulfilment

import java.time.LocalDate

import com.gu.supporter.fulfilment.LocalDateHelpers.LocalDateWithWorkingDaySupport
import org.scalatest.{FlatSpec, Matchers}

class LocalDateHelpersSpec extends FlatSpec with Matchers with DateSupport {

  "isWorkingDay" should "correctly identify normal working days" in {
    (LocalDate.parse( /* Monday    */ "2019-12-02") isWorkingDay) shouldBe true
    (LocalDate.parse( /* Tuesday   */ "2019-12-03") isWorkingDay) shouldBe true
    (LocalDate.parse( /* Wednesday */ "2019-12-04") isWorkingDay) shouldBe true
    (LocalDate.parse( /* Thursday  */ "2019-12-05") isWorkingDay) shouldBe true
    (LocalDate.parse( /* Friday    */ "2019-12-06") isWorkingDay) shouldBe true
    (LocalDate.parse( /* Saturday  */ "2019-12-07") isWorkingDay) shouldBe false
    (LocalDate.parse( /* Sunday    */ "2019-12-08") isWorkingDay) shouldBe false
  }

  "findPreviousWorkingDay" should "find the previous working day for normal working days" in {
    (LocalDate.parse( /* Monday    */ "2019-12-02") findPreviousWorkingDay) should equalDate("2019-11-29")
    (LocalDate.parse( /* Tuesday   */ "2019-12-03") findPreviousWorkingDay) should equalDate("2019-12-02")
    (LocalDate.parse( /* Wednesday */ "2019-12-04") findPreviousWorkingDay) should equalDate("2019-12-03")
    (LocalDate.parse( /* Thursday  */ "2019-12-05") findPreviousWorkingDay) should equalDate("2019-12-04")
    (LocalDate.parse( /* Friday    */ "2019-12-06") findPreviousWorkingDay) should equalDate("2019-12-05")
    (LocalDate.parse( /* Saturday  */ "2019-12-07") findPreviousWorkingDay) should equalDate("2019-12-06")
    (LocalDate.parse( /* Sunday    */ "2019-12-08") findPreviousWorkingDay) should equalDate("2019-12-06")
    (LocalDate.parse( /* Monday    */ "2019-12-09") findPreviousWorkingDay) should equalDate("2019-12-06")
    (LocalDate.parse( /* Tuesday   */ "2019-12-10") findPreviousWorkingDay) should equalDate("2019-12-09")
  }

}
