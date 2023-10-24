package com.gu.newproduct.api.addsubscription.zuora

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.util.resthttp.RestRequestMaker.{RequestsGet, WithoutCheck}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import play.api.libs.json.{Json, Reads}

object GetAccount {

  object WireModel {

    case class ZuoraAccount(
        IdentityId__c: Option[String],
        sfContactId__c: Option[String],
        DefaultPaymentMethodId: Option[String],
        AutoPay: Boolean,
        Balance: Double,
        Currency: String,
    )

    implicit val zaReadsZuoraAccount: Reads[ZuoraAccount] = Json.reads[ZuoraAccount]

    def fromWire(zuoraAccount: ZuoraAccount): ClientFailableOp[Account] =
      Currency.fromString(zuoraAccount.Currency) match {
        case Some(currency) =>
          ClientSuccess(
            Account(
              zuoraAccount.IdentityId__c.map(IdentityId),
              zuoraAccount.sfContactId__c.map(SfContactId.apply),
              zuoraAccount.DefaultPaymentMethodId.map(PaymentMethodId),
              AutoPay(zuoraAccount.AutoPay),
              AccountBalanceMinorUnits((zuoraAccount.Balance * 100).toInt),
              currency,
            ),
          )

        case None =>
          GenericError(s"unknown currency ${zuoraAccount.Currency} supported : ${Currency.websiteSupportedCurrencies
              .map(_.iso) ++ Currency.otherCurrencies.keys}")
      }

  }

  import WireModel._

  case class IdentityId(value: String) extends AnyVal

  case class SfContactId(value: String) extends AnyVal

  case class PaymentMethodId(value: String) extends AnyVal

  case class AutoPay(value: Boolean) extends AnyVal

  case class AccountBalanceMinorUnits(value: Int) extends AnyVal

  case class Account(
      identityId: Option[IdentityId],
      sfContactId: Option[SfContactId],
      paymentMethodId: Option[PaymentMethodId],
      autoPay: AutoPay,
      accountBalanceMinorUnits: AccountBalanceMinorUnits,
      currency: Currency,
  )

  def apply(get: RequestsGet[ZuoraAccount])(accountId: ZuoraAccountId): ClientFailableOp[Account] =
    get(s"object/account/${accountId.value}", WithoutCheck).flatMap(fromWire)

}
