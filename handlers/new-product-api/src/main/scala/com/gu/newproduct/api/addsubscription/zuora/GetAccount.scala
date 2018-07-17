package com.gu.newproduct.api.addsubscription.zuora

import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, RequestsGet, WithoutCheck}
import play.api.libs.json.Json

object GetAccount {

  object WireModel {

    case class ZuoraAccount(
      IdentityId__c: Option[String],
      DefaultPaymentMethodId: Option[String],
      AutoPay: Boolean,
      Balance: Double
    )

    implicit val zaReadsZuoraAccount = Json.reads[ZuoraAccount]

    def fromWire(zuoraAccount: ZuoraAccount): Account =
      Account(
        zuoraAccount.IdentityId__c.map(IdentityId),
        zuoraAccount.DefaultPaymentMethodId.map(PaymentMethodId),
        AutoPay(zuoraAccount.AutoPay),
        AccountBalanceMinorUnits((zuoraAccount.Balance * 100).toInt)
      )
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
    accountBalanceMinorUnits: AccountBalanceMinorUnits
  )

  def apply(get: RequestsGet[ZuoraAccount])(accountId: ZuoraAccountId): ClientFailableOp[Account] =
    get(s"object/account/${accountId.value}", WithoutCheck).map(fromWire)

}
