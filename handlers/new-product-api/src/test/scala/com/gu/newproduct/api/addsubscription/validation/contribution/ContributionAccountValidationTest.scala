package com.gu.newproduct.api.addsubscription.validation.contribution

import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.validation.{Failed, Passed, ValidatedAccount}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class ContributionAccountValidationTest extends AnyFlatSpec with Matchers {
  val account = ValidatedAccount(
    identityId = Some(IdentityId("identityId")),
    sfContactId = Some(SfContactId("sfContactId")),
    paymentMethodId = PaymentMethodId("id"),
    autoPay = AutoPay(true),
    accountBalanceMinorUnits = AccountBalanceMinorUnits(1233),
    currency = GBP,
  )
  it should "pass if account has an identity Id" in {
    ContributionAccountValidation(account) shouldBe Passed(account)
  }
  it should "fail if account has no identity id" in {
    val noIdAccount = account.copy(identityId = None)
    ContributionAccountValidation(noIdAccount) shouldBe Failed("Zuora account has no Identity Id")
  }
}
