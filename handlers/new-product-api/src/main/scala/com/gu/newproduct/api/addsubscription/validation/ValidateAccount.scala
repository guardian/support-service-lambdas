package com.gu.newproduct.api.addsubscription.validation

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.{Account, PaymentMethodId}

case class ValidatedAccount(paymentMethodId: PaymentMethodId, currency: Currency)

object ValidateAccount {
  def apply(account: Account): ValidationResult[ValidatedAccount] = {
    for {
      _ <- account.identityId.isDefined orFailWith "Zuora account has no Identity Id"
      _ <- account.autoPay.value orFailWith "Zuora account has autopay disabled"
      _ <- (account.accountBalanceMinorUnits.value == 0) orFailWith "Zuora account balance is not zero"
      paymentMethodId <- account.paymentMethodId getOrFailWith "Zuora account has no default payment method"
    } yield (ValidatedAccount(paymentMethodId, account.currency))
  }
}

