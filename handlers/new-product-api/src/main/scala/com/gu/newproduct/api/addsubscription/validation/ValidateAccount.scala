package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.{Account, PaymentMethodId}

object ValidateAccount {
  def apply(account: Account): ValidationResult[PaymentMethodId] = {
    for {
      _ <- account.identityId.isDefined orFailWith "Zuora account has no Identity Id"
      _ <- account.autoPay.value orFailWith "Zuora account has autopay disabled"
      _ <- (account.accountBalanceMinorUnits.value == 0) orFailWith "Zuora account balance is not zero"
      paymentMethodId <- account.paymentMethodId getOrFailWith "Zuora account has no default payment method"
    } yield paymentMethodId
  }
}

