package com.gu.newproduct.api.addsubscription

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, RequestsGET}
import play.api.libs.json.{JsValue, Json, Reads}

object GetAccountSummary {

  object WireModel {

    case class ZuoraAccount(
      IdentityId__c: String,
      DefaultPaymentMethodId: String,
      AutoPay: Boolean,
      Balance: Double
    )

    implicit val zaReadsZuoraAccount = Json.reads[ZuoraAccount]

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
  object AccountSummary {
    def fromWire(zuoraAccount: ZuoraAccount): AccountSummary =
      AccountSummary(
        IdentityId(zuoraAccount.IdentityId__c),
        PaymentMethodId(zuoraAccount.DefaultPaymentMethodId),
        AutoPay(zuoraAccount.AutoPay),
        AccountBalanceMinorUnits((zuoraAccount.Balance * 100).toInt)
      )
  }
//  implicit val summaryReads: Reads[AccountSummary] =


  def apply(requestsGET: RequestsGET)(accountId: ZuoraAccountId): ClientFailableOp[AccountSummary] = ???
//    requestsGET.get[AccountSummary](s"object/account/${accountId.value}")

}
