package com.gu.newproduct.api.addsubscription.validation.supporterplus

import com.gu.i18n.Currency
import com.gu.i18n.Currency._
import com.gu.newproduct.api.addsubscription.validation.supporterplus.SupporterPlusValidations.ValidatableFields
import com.gu.newproduct.api.addsubscription.validation.{Failed, Passed, ValidationResult}
import com.gu.newproduct.api.productcatalog.PlanId.MonthlySupporterPlus
import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, PlanId}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import java.time.LocalDate

class SupporterPlusValidationsTest extends AnyFlatSpec with Matchers {

  val testRequest = ValidatableFields(
    startDate = LocalDate.of(2018, 7, 20),
    amountMinorUnits = Some(AmountMinorUnits(100))
  )

  def now = () => LocalDate.of(2018, 7, 20)

  def amountLimitsFor(planId: PlanId, currency: Currency) = {
    planId shouldBe MonthlySupporterPlus
    currency shouldBe GBP
    AmountLimits.limitsFromMajorToMinorUnits(min = 12, max = 166)
  }

  def isValidStartDate(d: LocalDate): ValidationResult[Unit] =
    if (d == LocalDate.of(2018, 7, 20)) Passed(()) else Failed("Date validation failed!")

  def wiredValidator = SupporterPlusValidations(isValidStartDate, amountLimitsFor) _

  it should "return error if date validation fails" in {
    val oldRequest = testRequest.copy(startDate = LocalDate.of(1985, 10, 26))
    wiredValidator(oldRequest, MonthlySupporterPlus, GBP) shouldBe Failed("Date validation failed!")
  }
  it should "return error if amount is too small" in {
    wiredValidator(testRequest.copy(amountMinorUnits = Some(AmountMinorUnits(1100))), MonthlySupporterPlus, GBP) shouldBe Failed("amount must be at least GBP 12")
  }

  it should "return error if amount is too large" in {
    wiredValidator(testRequest.copy(amountMinorUnits = Some(AmountMinorUnits(16700))), MonthlySupporterPlus, GBP) shouldBe Failed("amount must not be more than GBP 166")
  }

  it should "return success if amount is within valid range" in {
    wiredValidator(testRequest.copy(amountMinorUnits = Some(AmountMinorUnits(15000))), MonthlySupporterPlus, GBP) shouldBe Passed((AmountMinorUnits(15000)))
  }

  it should "return error if amount is missing" in {
    wiredValidator(testRequest.copy(amountMinorUnits = None), MonthlySupporterPlus, GBP) shouldBe Failed("amountMinorUnits is missing")
  }

}
