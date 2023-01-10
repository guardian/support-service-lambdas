package com.gu.newproduct.api.addsubscription.validation

import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.zuora.GetAccount._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class ValidateAccountTest extends AnyFlatSpec with Matchers {

  val validAccount = Account(
    identityId = Some(IdentityId("idAccount1")),
    sfContactId = Some(SfContactId("sfContactId")),
    paymentMethodId = Some(PaymentMethodId("activePaymentMethod")),
    autoPay = AutoPay(true),
    accountBalanceMinorUnits = AccountBalanceMinorUnits(0),
    currency = GBP,
  )

  val validatedAccount = ValidatedAccount(
    identityId = Some(IdentityId("idAccount1")),
    sfContactId = Some(SfContactId("sfContactId")),
    paymentMethodId = PaymentMethodId("activePaymentMethod"),
    autoPay = AutoPay(true),
    accountBalanceMinorUnits = AccountBalanceMinorUnits(0),
    currency = GBP,
  )
  it should "succeed with valid account" in {
    ValidateAccount(validAccount) shouldBe Passed(validatedAccount)
  }
  it should "succeed if account has no identity id" in {
    val noIdentityAccount = validAccount.copy(identityId = None)
    val noIdentityValidatedAccount = validatedAccount.copy(identityId = None)
    ValidateAccount(noIdentityAccount) shouldBe Passed(noIdentityValidatedAccount)
  }
  it should "fail if account has no default payment method id" in {
    val noPaymentAccount = validAccount.copy(paymentMethodId = None)

    ValidateAccount(noPaymentAccount) shouldBe Failed("Zuora account has no default payment method")
  }
  it should "fail if account has autopay disabled" in {
    val noAutoPayAccount = validAccount.copy(autoPay = AutoPay(false))
    ValidateAccount(noAutoPayAccount) shouldBe Failed("Zuora account has autopay disabled")
  }

}
