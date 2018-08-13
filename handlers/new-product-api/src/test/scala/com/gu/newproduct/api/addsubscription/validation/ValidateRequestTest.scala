package com.gu.newproduct.api.addsubscription.validation

import java.time.LocalDate

import com.gu.i18n.Currency
import com.gu.i18n.Currency._
import com.gu.newproduct.api.addsubscription._
import com.gu.newproduct.api.addsubscription.validation.ValidateRequest.ValidatableFields
import com.gu.newproduct.api.productcatalog.PlanId
import org.scalatest.{FlatSpec, Matchers}

class ValidateRequestTest extends FlatSpec with Matchers {

  val testRequest = ValidatableFields(
    startDate = LocalDate.of(2018, 7, 20),
    amountMinorUnits = AmountMinorUnits(100),
    planId = PlanId("monthly_contribution")
  )

  def now = () => LocalDate.of(2018, 7, 20)

  def amountLimitsFor(currency: Currency) = {
    currency shouldBe GBP
    AmountLimits(min = 100, max = 200)
  }

  def isValidStartDate(d: LocalDate): ValidationResult[Unit] =
    if (d == LocalDate.of(2018, 7, 20)) Passed(()) else Failed("Date validation failed!")

  def wiredValidator = ValidateRequest(isValidStartDate, amountLimitsFor) _

  it should "return error if date validation fails" in {
    val oldRequest = testRequest.copy(startDate = LocalDate.of(1985, 10, 26))
    wiredValidator(oldRequest, GBP) shouldBe Failed("Date validation failed!")
  }
  it should "return error if amount is too small" in {
    wiredValidator(testRequest.copy(amountMinorUnits = AmountMinorUnits(99)), GBP) shouldBe Failed("amount must be at least 100")
  }

  it should "return error if amount is too large" in {
    wiredValidator(testRequest.copy(amountMinorUnits = AmountMinorUnits(201)), GBP) shouldBe Failed("amount must not be more than 200")
  }
  it should "return success if amount is within valid range" in {
    wiredValidator(testRequest.copy(amountMinorUnits = AmountMinorUnits(150)), GBP) shouldBe Passed(())
  }

  it should "return error if planId is invalid " in {
    val actual = wiredValidator(testRequest.copy(planId = PlanId("wrong")), GBP)
    actual.mapFailure(_.split(":")(0)) should be(Failed("unsupported plan"))
  }

}
