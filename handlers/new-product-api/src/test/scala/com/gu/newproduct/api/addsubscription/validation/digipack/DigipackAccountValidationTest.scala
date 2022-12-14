package com.gu.newproduct.api.addsubscription.validation.digipack

import com.gu.i18n.Currency.USD
import com.gu.newproduct.api.addsubscription.validation.{Failed, Passed, ValidatedAccount}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class DigipackAccountValidationTest extends AnyFlatSpec with Matchers {
  val account = ValidatedAccount(
    identityId = Some(IdentityId("identityId")),
    sfContactId = Some(SfContactId("sfContactId")),
    paymentMethodId = PaymentMethodId("id"),
    autoPay = AutoPay(true),
    accountBalanceMinorUnits = AccountBalanceMinorUnits(1233),
    currency = USD,
  )
  it should "pass if identity id is defined" in {
    DigipackAccountValidation(account) shouldBe Passed(account)
  }

  it should "fail if identity id is None" in {
    val noIdentityAccount = account.copy(identityId = None)
    DigipackAccountValidation(noIdentityAccount) shouldBe Failed("Account has no associated identity Id")
  }

  it should "fail if identity id is just whiteSpaces" in {
    val noIdentityAccount = account.copy(identityId = Some(IdentityId("    ")))
    DigipackAccountValidation(noIdentityAccount) shouldBe Failed("Account has no associated identity Id")
  }
}
