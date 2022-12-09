package com.gu.supporter.fulfilment

import java.time.LocalDate

import com.gu.supporter.fulfilment.LocalDateHelpers.LocalDateWithWorkingDaySupport
import scala.language.postfixOps
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class LocalDateHelpersSpec extends AnyFlatSpec with Matchers with DateSupport {

  implicit val sampleBankHolidays: BankHolidays = BankHolidays(
    List(
      LocalDate.parse( /* New Year’s Day */ "2021-01-01"),
      LocalDate.parse( /* Good Friday */ "2021-04-02"),
      LocalDate.parse( /* Easter Monday */ "2021-04-05"),
      LocalDate.parse( /* Early May bank holiday */ "2021-05-03"),
      LocalDate.parse( /* Spring bank holiday */ "2021-05-31"),
      LocalDate.parse( /* Summer bank holiday */ "2021-08-30"),
      LocalDate.parse( /* Christmas Day */ "2021-12-27"),
      LocalDate.parse( /* Boxing Day */ "2021-12-28"),
    ).map(Event),
  )

  "isWorkingDay" should "correctly identify normal working days" in {
    (LocalDate.parse( /* Monday    */ "2019-12-02") isWorkingDay) shouldBe true
    (LocalDate.parse( /* Tuesday   */ "2019-12-03") isWorkingDay) shouldBe true
    (LocalDate.parse( /* Wednesday */ "2019-12-04") isWorkingDay) shouldBe true
    (LocalDate.parse( /* Thursday  */ "2019-12-05") isWorkingDay) shouldBe true
    (LocalDate.parse( /* Friday    */ "2019-12-06") isWorkingDay) shouldBe true
    (LocalDate.parse( /* Saturday  */ "2019-12-07") isWorkingDay) shouldBe false
    (LocalDate.parse( /* Sunday    */ "2019-12-08") isWorkingDay) shouldBe false
  }

  "isWorkingDay" should "correctly identify bank holiday non-working days" in {
    sampleBankHolidays.events.foreach { event =>
      (event.date isWorkingDay) shouldBe false
    }
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

  "findPreviousWorkingDay" should "find the previous working day around bank holidays" in {

    // example Spring bank holiday - "2021-05-31"
    (LocalDate.parse( /* Monday    */ "2021-05-31") findPreviousWorkingDay) should equalDate("2021-05-28")
    (LocalDate.parse( /* Tuesday   */ "2021-06-01") findPreviousWorkingDay) should equalDate(
      "2021-05-28",
    ) // note this is still the Friday from the week before, due to the bank holiday
    (LocalDate.parse( /* Wednesday */ "2021-06-02") findPreviousWorkingDay) should equalDate("2021-06-01")
    (LocalDate.parse( /* Thursday  */ "2021-06-03") findPreviousWorkingDay) should equalDate("2021-06-02")

    // example Easter weekend (Good Friday - "2021-04-02" AND Easter Monday -"2021-04-05")
    (LocalDate.parse( /* Monday    */ "2021-04-05") findPreviousWorkingDay) should equalDate(
      "2021-04-01",
    ) // not this is the thursday before good friday
    (LocalDate.parse( /* Tuesday   */ "2021-04-06") findPreviousWorkingDay) should equalDate(
      "2021-04-01",
    ) // note this is still the thursday before good friday, due to the bank holidays
    (LocalDate.parse( /* Wednesday */ "2021-04-07") findPreviousWorkingDay) should equalDate("2021-04-06")
    (LocalDate.parse( /* Thursday  */ "2021-04-08") findPreviousWorkingDay) should equalDate("2021-04-07")
  }

}
