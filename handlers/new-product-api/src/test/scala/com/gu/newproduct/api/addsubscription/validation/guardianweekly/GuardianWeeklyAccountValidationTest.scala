package com.gu.newproduct.api.addsubscription.validation.guardianweekly

import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.validation.{Failed, Passed, ValidatedAccount}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.{
  AccountBalanceMinorUnits,
  AutoPay,
  IdentityId,
  PaymentMethodId,
}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GuardianWeeklyAccountValidationTest extends AnyFlatSpec with Matchers {
  val account = ValidatedAccount(
    identityId = Some(IdentityId("1234")),
    sfContactId = None,
    paymentMethodId = PaymentMethodId("id"),
    autoPay = AutoPay(true),
    accountBalanceMinorUnits = AccountBalanceMinorUnits(1233),
    currency = GBP,
  )
  it should "pass if account is valid" in {
    GuardianWeeklyAccountValidation(account) shouldBe Passed(account)
  }

  it should "fail if identity id is not present" in {
    val noIdentityIdAccount = account.copy(identityId = None)
    GuardianWeeklyAccountValidation(noIdentityIdAccount) shouldBe Failed("Zuora account has no Identity Id")
  }
}
