package com.gu.newproduct.api.addsubscription.zuora

import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, RequestsGet, WithoutCheck}
import play.api.libs.json.Json

object GetAccount {

  object WireModel {

    case class ZuoraAccount(
      IdentityId__c: String,
      DefaultPaymentMethodId: String,
      AutoPay: Boolean,
      Balance: Double
    )

    implicit val zaReadsZuoraAccount = Json.reads[ZuoraAccount]

    def fromWire(zuoraAccount: ZuoraAccount): AccountSummary =
      AccountSummary(
        IdentityId(zuoraAccount.IdentityId__c),
        PaymentMethodId(zuoraAccount.DefaultPaymentMethodId),
        AutoPay(zuoraAccount.AutoPay),
        AccountBalanceMinorUnits((zuoraAccount.Balance * 100).toInt)
      )

  }

  import WireModel._

  case class IdentityId(value: String)
  case class PaymentMethodId(value: String)
  case class AutoPay(value: Boolean)
  case class AccountBalanceMinorUnits(value: Int)

  case class AccountSummary(
    identityId: IdentityId,
    paymentMethodId: PaymentMethodId,
    autoPay: AutoPay,
    accountBalanceMinorUnits: AccountBalanceMinorUnits
  )

  def apply(get: RequestsGet[ZuoraAccount])(accountId: ZuoraAccountId): ClientFailableOp[AccountSummary] =
    get(s"object/account/${accountId.value}", WithoutCheck).map(fromWire)

}
