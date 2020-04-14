package com.gu.newproduct.api.addsubscription.validation.guardianweekly

import com.gu.i18n.Currency.{GBP, USD}
import com.gu.newproduct.api.addsubscription.validation.paper.PaperAccountValidation
import com.gu.newproduct.api.addsubscription.validation.{Failed, Passed, ValidatedAccount}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.{AccountBalanceMinorUnits, AutoPay, PaymentMethodId, SfContactId}
import org.scalatest.{FlatSpec, Matchers}

class GuardianWeeklyAccountValidationTest extends FlatSpec with Matchers {
  val account = ValidatedAccount(
    identityId = None,
    sfContactId = Some(SfContactId("sfContactId")),
    paymentMethodId = PaymentMethodId("id"),
    autoPay = AutoPay(true),
    accountBalanceMinorUnits = AccountBalanceMinorUnits(1233),
    currency = GBP
  )
  it should "pass if currency in account is GBP " in {
    PaperAccountValidation(account) shouldBe Passed(account)
  }

  it should "fail if currency in account is not GBP " in {
    val dollarAccount = account.copy(currency = USD)
    PaperAccountValidation(dollarAccount) shouldBe Failed("Invalid currency in Zuora account: USD. Only GBP is allowed for the selected plan")
  }
}
