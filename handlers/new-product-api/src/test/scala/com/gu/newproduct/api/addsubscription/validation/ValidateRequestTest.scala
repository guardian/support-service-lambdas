package com.gu.newproduct.api.addsubscription.validation

import java.time.LocalDate

import com.gu.i18n.Currency
import com.gu.i18n.Currency._
import com.gu.newproduct.api.addsubscription.{AddSubscriptionRequest, CaseId, ZuoraAccountId}
import org.scalatest.{FlatSpec, Matchers}

class ValidateRequestTest extends FlatSpec with Matchers {

  val testRequest = AddSubscriptionRequest(
    zuoraAccountId = ZuoraAccountId("accountId"),
    startDate = LocalDate.of(2018, 7, 20),
    acquisitionSource = "someSource",
    createdByCSR = "csrName",
    amountMinorUnits = 100,
    acquisitionCase = CaseId("caseId")
  )

  def now = () => LocalDate.of(2018, 7, 20)

  def amountLimitsFor(currency: Currency) = {
    currency shouldBe GBP
    AmountLimits(min = 100, max = 200)
  }
  def wiredValidator = ValidateRequest(now, amountLimitsFor) _

  it should "return error if startdate is not today" in {
    val oldRequest = testRequest.copy(startDate = LocalDate.of(1985, 10, 26))
    wiredValidator(oldRequest, GBP) shouldBe Failed("start date must be today")
  }
  it should "return error if amount is too small" in {
    wiredValidator(testRequest.copy(amountMinorUnits = 99), GBP) shouldBe Failed("amount must be at least 100")
  }

  it should "return error if amount is too large" in {
    wiredValidator(testRequest.copy(amountMinorUnits = 201), GBP) shouldBe Failed("amount must not be more than 200")
  }
  it should "return success if amount is within valid range" in {
    wiredValidator(testRequest.copy(amountMinorUnits = 150), GBP) shouldBe Passed(())
  }

}
