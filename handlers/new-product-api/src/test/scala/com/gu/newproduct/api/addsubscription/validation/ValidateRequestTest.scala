package com.gu.newproduct.api.addsubscription.validation

import java.time.{LocalDate, LocalDateTime}

import com.gu.i18n.Currency._
import com.gu.newproduct.api.addsubscription.{AddSubscriptionRequest, CaseId, ZuoraAccountId}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
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

  def now = () => LocalDateTime.of(2018, 7, 20, 0, 0)
  def wiredValidator = ValidateRequest(now) _
  def validationError(msg: String) = ReturnWithResponse(ApiGatewayResponse.messageResponse(statusCode = "422", message = msg))

  it should "return error if startdate is not today" in {
    val oldRequest = testRequest.copy(startDate = LocalDate.of(1985, 10, 26))
    wiredValidator(oldRequest, GBP) shouldBe validationError("start date must be today")
  }
  it should "return error if amount is too small for GBP" in {
    wiredValidator(testRequest.copy(amountMinorUnits = 199), GBP) shouldBe validationError("amount must be at least 200")
  }
  it should "return error if amount is too small for EUR" in {
    wiredValidator(testRequest.copy(amountMinorUnits = 199), EUR) shouldBe validationError("amount must be at least 200")
  }
  it should "return error if amount is too small for USD" in {
    wiredValidator(testRequest.copy(amountMinorUnits = 199), USD) shouldBe validationError("amount must be at least 200")
  }
  it should "return error if amount is too small for CAD" in {
    wiredValidator(testRequest.copy(amountMinorUnits = 499), CAD) shouldBe validationError("amount must be at least 500")
  }
  it should "return error if amount is too small for AUD" in {
    wiredValidator(testRequest.copy(amountMinorUnits = 199), AUD) shouldBe validationError("amount must be at least 200")
  }
  it should "return error if amount is too small for NZD" in {
    wiredValidator(testRequest.copy(amountMinorUnits = 999), NZD) shouldBe validationError("amount must be at least 1000")
  }
  it should "return error if amount is too large for GBP" in {
    wiredValidator(testRequest.copy(amountMinorUnits = 16601), GBP) shouldBe validationError("amount must not be more than 16600")
  }
  it should "return error if amount is too large for EUR" in {
    wiredValidator(testRequest.copy(amountMinorUnits = 16601), EUR) shouldBe validationError("amount must not be more than 16600")
  }
  it should "return error if amount is too large for USD" in {
    wiredValidator(testRequest.copy(amountMinorUnits = 16601), USD) shouldBe validationError("amount must not be more than 16600")
  }
  it should "return error if amount is too large for CAD" in {
    wiredValidator(testRequest.copy(amountMinorUnits = 16601), CAD) shouldBe validationError("amount must not be more than 16600")
  }
  it should "return error if amount is too large for AUD" in {
    wiredValidator(testRequest.copy(amountMinorUnits = 16601), AUD) shouldBe validationError("amount must not be more than 16600")
  }
  it should "return error if amount is too large for NZD" in {
    wiredValidator(testRequest.copy(amountMinorUnits = 16601), NZD) shouldBe validationError("amount must not be more than 16600")
  }
  it should "return success if amount is within valid range for GBP" in {
    wiredValidator(testRequest.copy(amountMinorUnits = 2000), GBP) shouldBe ContinueProcessing(())
  }
  it should "return success if amount is within valid range for EUR" in {
    wiredValidator(testRequest.copy(amountMinorUnits = 2000), EUR) shouldBe ContinueProcessing(())
  }
  it should "return success if amount is within valid range forUSD" in {
    wiredValidator(testRequest.copy(amountMinorUnits = 2000), USD) shouldBe ContinueProcessing(())
  }
  it should "return success if amount is within valid range for CAD" in {
    wiredValidator(testRequest.copy(amountMinorUnits = 2000), CAD) shouldBe ContinueProcessing(())
  }
  it should "return success if amount is within valid range for AUD" in {
    wiredValidator(testRequest.copy(amountMinorUnits = 2000), AUD) shouldBe ContinueProcessing(())
  }
  it should "return success if amount is within valid range for NZD" in {
    wiredValidator(testRequest.copy(amountMinorUnits = 2000), NZD) shouldBe ContinueProcessing(())
  }

}
