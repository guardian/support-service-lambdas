package com.gu.newproduct.api.addsubscription.validation

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.zuora.GetAccount._

case class ValidatedAccount(
    identityId: Option[IdentityId],
    sfContactId: Option[SfContactId],
    paymentMethodId: PaymentMethodId,
    autoPay: AutoPay,
    accountBalanceMinorUnits: AccountBalanceMinorUnits,
    currency: Currency,
)

object ValidateAccount {
  def apply(account: Account): ValidationResult[ValidatedAccount] = {
    for {
      _ <- account.autoPay.value orFailWith "Zuora account has autopay disabled"
      paymentMethodId <- account.paymentMethodId getOrFailWith "Zuora account has no default payment method"
    } yield ValidatedAccount(
      account.identityId,
      account.sfContactId,
      paymentMethodId,
      account.autoPay,
      account.accountBalanceMinorUnits,
      account.currency,
    )
  }
}
