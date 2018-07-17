package com.gu.newproduct.api.addsubscription

import com.gu.newproduct.api.addsubscription.Handler.ProductRatePlanId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.{Account, PaymentMethodId}
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.Subscription
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.{Active => ActiveSub}
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethodStatus.{Active => ActivePaymentMethod, PaymentMethodStatus}

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, GenericError}
import scalaz.{-\/, \/, \/-}

object PrerequesiteCheck {
  def apply(
    getAccount: ZuoraAccountId => ClientFailableOp[Account],
    getPaymentMethodStatus: PaymentMethodId => ClientFailableOp[PaymentMethodStatus],
    getAccountSubscriptions: ZuoraAccountId => ClientFailableOp[List[Subscription]],
    contributionRatePlanIds : List[ProductRatePlanId]
  )(accountId: ZuoraAccountId): ClientFailableOp[Unit] = {

    def hasContributions(s:Subscription) = s.productRateplanIds.exists(contributionRatePlanIds.contains(_))

    for {
      account <- getAccount(accountId)
      _ <- check(account.identityId.isDefined, ifFalseReturn = "Zuora account has no Identity Id")
      _ <- check(account.autoPay.value, ifFalseReturn = "Zuora account has autopay disabled")
      _ <- check(account.accountBalanceMinorUnits.value == 0, ifFalseReturn = "Zuora account balance is not zero")
      paymentMethodId <- extract(account.paymentMethodId, ifNoneReturn = "Zuora account has no default payment method")
      paymentMethodStatus <- getPaymentMethodStatus(paymentMethodId)
      _ <- check(paymentMethodStatus == ActivePaymentMethod, "Default payment method status in Zuora account is not active")
      subscriptions <- getAccountSubscriptions(accountId)
      _ <- check(!subscriptions.filter(_.status == ActiveSub).exists(hasContributions), ifFalseReturn = "Zuora account already has an active recurring contribution subscription")
    } yield ()
  }

  def check(condition: Boolean, ifFalseReturn: String): ClientFailableOp[Unit] = if (condition) \/-(()) else -\/(GenericError(ifFalseReturn))

  def extract[V](option: Option[V], ifNoneReturn: String): ClientFailableOp[V] = option.map(someValue => \/-(someValue)).getOrElse(-\/(GenericError(ifNoneReturn)))

}
