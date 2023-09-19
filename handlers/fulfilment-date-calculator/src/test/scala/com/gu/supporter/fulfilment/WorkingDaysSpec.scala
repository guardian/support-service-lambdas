package com.gu.supporter.fulfilment

import java.time.LocalDate

import com.gu.supporter.fulfilment.WorkingDays
import scala.language.postfixOps
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class WorkingDaysSpec extends AnyFlatSpec with Matchers with DateSupport {

  val sampleBankHolidays: BankHolidays = BankHolidays(
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
  val x = new WorkingDays(sampleBankHolidays)
  import x._

  "isWorkingDay" should "correctly identify normal working days" in {
    isWorkingDay(LocalDate.parse( /* Monday    */ "2019-12-02")) shouldBe true
    isWorkingDay(LocalDate.parse( /* Tuesday   */ "2019-12-03")) shouldBe true
    isWorkingDay(LocalDate.parse( /* Wednesday */ "2019-12-04")) shouldBe true
    isWorkingDay(LocalDate.parse( /* Thursday  */ "2019-12-05")) shouldBe true
    isWorkingDay(LocalDate.parse( /* Friday    */ "2019-12-06")) shouldBe true
    isWorkingDay(LocalDate.parse( /* Saturday  */ "2019-12-07")) shouldBe false
    isWorkingDay(LocalDate.parse( /* Sunday    */ "2019-12-08")) shouldBe false
  }

  "isWorkingDay" should "correctly identify bank holiday non-working days" in {
    sampleBankHolidays.events.foreach { event =>
      isWorkingDay(event.date) shouldBe false
    }
  }

  "findWorkingDayBefore" should "find the previous working day for normal working days" in {
    findWorkingDayBefore(LocalDate.parse( /* Monday    */ "2019-12-02")) should equalDate("2019-11-29")
    findWorkingDayBefore(LocalDate.parse( /* Tuesday   */ "2019-12-03")) should equalDate("2019-12-02")
    findWorkingDayBefore(LocalDate.parse( /* Wednesday */ "2019-12-04")) should equalDate("2019-12-03")
    findWorkingDayBefore(LocalDate.parse( /* Thursday  */ "2019-12-05")) should equalDate("2019-12-04")
    findWorkingDayBefore(LocalDate.parse( /* Friday    */ "2019-12-06")) should equalDate("2019-12-05")
    findWorkingDayBefore(LocalDate.parse( /* Saturday  */ "2019-12-07")) should equalDate("2019-12-06")
    findWorkingDayBefore(LocalDate.parse( /* Sunday    */ "2019-12-08")) should equalDate("2019-12-06")
    findWorkingDayBefore(LocalDate.parse( /* Monday    */ "2019-12-09")) should equalDate("2019-12-06")
    findWorkingDayBefore(LocalDate.parse( /* Tuesday   */ "2019-12-10")) should equalDate("2019-12-09")
  }

  "findWorkingDayBefore" should "find the previous working day around bank holidays" in {

    // example Spring bank holiday - "2021-05-31"
    findWorkingDayBefore(LocalDate.parse( /* Monday    */ "2021-05-31")) should equalDate("2021-05-28")
    findWorkingDayBefore(LocalDate.parse( /* Tuesday   */ "2021-06-01")) should equalDate(
      "2021-05-28",
    ) // note this is still the Friday from the week before, due to the bank holiday
    findWorkingDayBefore(LocalDate.parse( /* Wednesday */ "2021-06-02")) should equalDate("2021-06-01")
    findWorkingDayBefore(LocalDate.parse( /* Thursday  */ "2021-06-03")) should equalDate("2021-06-02")

    // example Easter weekend (Good Friday - "2021-04-02" AND Easter Monday -"2021-04-05")
    findWorkingDayBefore(LocalDate.parse( /* Monday    */ "2021-04-05")) should equalDate(
      "2021-04-01",
    ) // not this is the thursday before good friday
    findWorkingDayBefore(LocalDate.parse( /* Tuesday   */ "2021-04-06")) should equalDate(
      "2021-04-01",
    ) // note this is still the thursday before good friday, due to the bank holidays
    findWorkingDayBefore(LocalDate.parse( /* Wednesday */ "2021-04-07")) should equalDate("2021-04-06")
    findWorkingDayBefore(LocalDate.parse( /* Thursday  */ "2021-04-08")) should equalDate("2021-04-07")
  }

}
