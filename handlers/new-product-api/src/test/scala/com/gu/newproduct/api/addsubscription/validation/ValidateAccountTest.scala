package com.gu.newproduct.api.addsubscription.validation

import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.zuora.GetAccount._
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import org.scalatest.{FlatSpec, Matchers}

class ValidateAccountTest extends FlatSpec with Matchers {

  val validAccount = Account(
    identityId = Some(IdentityId("idAccount1")),
    paymentMethodId = Some(PaymentMethodId("activePaymentMethod")),
    autoPay = AutoPay(true),
    accountBalanceMinorUnits = AccountBalanceMinorUnits(0),
    currency = GBP
  )

  it should "succeed with valid account" in {
    ValidateAccount(validAccount) shouldBe Passed(ValidatedAccount(PaymentMethodId("activePaymentMethod"), GBP))
  }
  it should "fail if account has no identity id" in {
    val noIdentityAccount = validAccount.copy(identityId = None)

    ValidateAccount(noIdentityAccount) shouldBe Failed("Zuora account has no Identity Id")
  }
  it should "fail if account has no default payment method id" in {
    val noPaymentAccount = validAccount.copy(paymentMethodId = None)

    ValidateAccount(noPaymentAccount) shouldBe Failed("Zuora account has no default payment method")
  }
  it should "fail if account has autopay disabled" in {
    val noAutoPayAccount = validAccount.copy(autoPay = AutoPay(false))
    ValidateAccount(noAutoPayAccount) shouldBe Failed("Zuora account has autopay disabled")
  }
  it should "fail if account balance is not zero" in {
    val balanceNotZeroAccount = validAccount.copy(accountBalanceMinorUnits = AccountBalanceMinorUnits(1000))
    ValidateAccount(balanceNotZeroAccount) shouldBe Failed("Zuora account balance is not zero")
  }

}
