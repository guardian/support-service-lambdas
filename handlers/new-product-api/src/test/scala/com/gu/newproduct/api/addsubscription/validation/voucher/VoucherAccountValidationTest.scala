package com.gu.newproduct.api.addsubscription.validation.voucher

import com.gu.i18n.Currency.{GBP, USD}
import com.gu.newproduct.api.addsubscription.validation.{Failed, Passed, ValidatedAccount}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.{AccountBalanceMinorUnits, AutoPay, IdentityId, PaymentMethodId}
import org.scalatest.{FlatSpec, Matchers}

class VoucherAccountValidationTest extends FlatSpec with Matchers {
  val account = ValidatedAccount(
    identityId = None,
    paymentMethodId = PaymentMethodId("id"),
    autoPay = AutoPay(true),
    accountBalanceMinorUnits = AccountBalanceMinorUnits(1233),
    currency = GBP
  )
  it should "pass if currency in account is GBP " in {
    VoucherAccountValidation(account) shouldBe Passed(account)
  }

  it should "fail if currency in account is not GBP " in {
    val dollarAccount = account.copy(currency = USD)
    VoucherAccountValidation(dollarAccount) shouldBe Failed("Invalid currency in Zuora account: USD. Only GBP is allowed for voucher plans")
  }
}
