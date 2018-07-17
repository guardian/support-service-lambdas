package com.gu.newproduct.api.addsubscription

import com.gu.newproduct.api.addsubscription.zuora.GetAccount.{AccountSummary, PaymentMethodId}
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.Subscription
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethodStatus.PaymentMethodStatus
import com.gu.util.zuora.RestRequestMaker.ClientFailableOp

object PrerequesiteCheck {
  def apply(
    getAccount: ZuoraAccountId => ClientFailableOp[AccountSummary],
   // getPaymentMethodStatus: PaymentMethodId => ClientFailableOp[PaymentMethodStatus],
  //  getAccountSubscriptions: ZuoraAccountId => ClientFailableOp[List[Subscription]]
  )(accountId: ZuoraAccountId): ClientFailableOp[Unit] = {
    for {
      account <- getAccount(accountId)
    } yield account
  }
}
