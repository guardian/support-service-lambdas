package com.gu.newproduct.api.addsubscription.zuora

import com.gu.i18n.Currency
import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.util.resthttp.RestRequestMaker.{RequestsGet, WithoutCheck}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import play.api.libs.json.Json

object GetAccount {

  object WireModel {

    case class ZuoraAccount(
      IdentityId__c: Option[String],
      DefaultPaymentMethodId: Option[String],
      AutoPay: Boolean,
      Balance: Double,
      Currency: String
    )

    implicit val zaReadsZuoraAccount = Json.reads[ZuoraAccount]

    def fromWire(zuoraAccount: ZuoraAccount): ClientFailableOp[Account] = Currency.fromString(zuoraAccount.Currency) match {
      case Some(currency) => ClientSuccess(
        Account(
          zuoraAccount.IdentityId__c.map(IdentityId),
          zuoraAccount.DefaultPaymentMethodId.map(PaymentMethodId),
          AutoPay(zuoraAccount.AutoPay),
          AccountBalanceMinorUnits((zuoraAccount.Balance * 100).toInt),
          currency
        )
      )

      case None => GenericError(s"unknown currency ${zuoraAccount.Currency} supported : ${Currency.all.map(_.iso)}")
    }

  }

  import WireModel._

  case class IdentityId(value: String)

  case class PaymentMethodId(value: String)

  case class AutoPay(value: Boolean)

  case class AccountBalanceMinorUnits(value: Int)

  case class Account(
    identityId: Option[IdentityId],
    paymentMethodId: Option[PaymentMethodId],
    autoPay: AutoPay,
    accountBalanceMinorUnits: AccountBalanceMinorUnits,
    currency: Currency
  )

  def apply(get: RequestsGet[ZuoraAccount])(accountId: ZuoraAccountId): ClientFailableOp[Account] =
    get(s"object/account/${accountId.value}", WithoutCheck).flatMap(fromWire)

}
