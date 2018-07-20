package com.gu.newproduct.api.addsubscription.validation

import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount._
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError, NotFound}
import org.scalatest.{FlatSpec, Matchers}

class ValidateAccountTest extends FlatSpec with Matchers {

  def validationError(msg: String) = ReturnWithResponse(ApiGatewayResponse.messageResponse(statusCode = "422", message = msg))

  val validAccount = Account(
    identityId = Some(IdentityId("idAccount1")),
    paymentMethodId = Some(PaymentMethodId("activePaymentMethod")),
    autoPay = AutoPay(true),
    accountBalanceMinorUnits = AccountBalanceMinorUnits(0),
    currency = GBP
  )

  def fakeGetAccount(response: Account)(zuoraAccountId: ZuoraAccountId): ClientFailableOp[Account] =
    if (zuoraAccountId.value == "validAccountId") ClientSuccess(response) else NotFound("invalidAccount")

  it should "return error with invalid account id " in {
    def getAccount = fakeGetAccount(response = validAccount) _

    ValidateAccount(getAccount)(ZuoraAccountId("invalidAccountId")) shouldBe validationError("Zuora account id is not valid")
  }

  it should "succeed with valid account" in {
    def getAccount = fakeGetAccount(response = validAccount) _

    ValidateAccount(getAccount)(ZuoraAccountId("validAccountId")) shouldBe ContinueProcessing(ValidatedAccount(PaymentMethodId("activePaymentMethod"), GBP))
  }
  it should "fail if account cannot be loaded" in {
    def errorGetAccount(zuoraAccountId: ZuoraAccountId) = GenericError("zuora is down")

    ValidateAccount(errorGetAccount)(ZuoraAccountId("validAccountId")) shouldBe ReturnWithResponse(ApiGatewayResponse.internalServerError("some logging message"))
  }
  it should "fail if account has no identity id" in {
    val noIdentityAccount = validAccount.copy(identityId = None)

    def getAccount = fakeGetAccount(response = noIdentityAccount) _

    ValidateAccount(getAccount)(ZuoraAccountId("validAccountId")) shouldBe validationError("Zuora account has no Identity Id")
  }
  it should "fail if account has no default payment method id" in {
    val noPaymentAccount = validAccount.copy(paymentMethodId = None)

    def getAccount = fakeGetAccount(response = noPaymentAccount) _

    ValidateAccount(getAccount)(ZuoraAccountId("validAccountId")) shouldBe validationError("Zuora account has no default payment method")
  }
  it should "fail if account has autopay disabled" in {
    val noAutoPayAccount = validAccount.copy(autoPay = AutoPay(false))

    def getAccount = fakeGetAccount(response = noAutoPayAccount) _

    ValidateAccount(getAccount)(ZuoraAccountId("validAccountId")) shouldBe validationError("Zuora account has autopay disabled")
  }
  it should "fail if account balance is not zero" in {
    val balanceNotZeroAccount = validAccount.copy(accountBalanceMinorUnits = AccountBalanceMinorUnits(1000))

    def getAccount = fakeGetAccount(response = balanceNotZeroAccount) _

    ValidateAccount(getAccount)(ZuoraAccountId("validAccountId")) shouldBe validationError("Zuora account balance is not zero")
  }

}
