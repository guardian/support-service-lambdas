package com.gu.newproduct.api.addsubscription

import com.gu.newproduct.api.addsubscription.Handler.ProductRatePlanId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.{Account, PaymentMethodId}
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.{Subscription, Active => ActiveSub}
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethodStatus.{PaymentMethodStatus, Active => ActivePaymentMethod}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientFailableOp
import TypeConvert._
object PrerequesiteCheck {
  def apply(
    getAccount: ZuoraAccountId => ClientFailableOp[Account],
    getPaymentMethodStatus: PaymentMethodId => ClientFailableOp[PaymentMethodStatus],
    getAccountSubscriptions: ZuoraAccountId => ClientFailableOp[List[Subscription]],
    contributionRatePlanIds: List[ProductRatePlanId]
  )(accountId: ZuoraAccountId): ApiGatewayOp[Unit] = {

    def hasContributions(s: Subscription) = s.productRateplanIds.exists(contributionRatePlanIds.contains(_))

    for {
      account <- getAccount(accountId).toApiGatewayOp("load account from Zuora")
      _ <- check(account.identityId.isDefined, ifFalseReturn = "Zuora account has no Identity Id")
      _ <- check(account.autoPay.value, ifFalseReturn = "Zuora account has autopay disabled")
      _ <- check(account.accountBalanceMinorUnits.value == 0, ifFalseReturn = "Zuora account balance is not zero")
      paymentMethodId <- extract(account.paymentMethodId, ifNoneReturn = "Zuora account has no default payment method")
      paymentMethodStatus <- getPaymentMethodStatus(paymentMethodId).toApiGatewayOp("load payment method status from Zuora")
      _ <- check(paymentMethodStatus == ActivePaymentMethod, "Default payment method status in Zuora account is not active")
      subscriptions <- getAccountSubscriptions(accountId).toApiGatewayOp("load subscriptions for Zuora account")
      _ <- check(!subscriptions.filter(_.status == ActiveSub).exists(hasContributions), ifFalseReturn = "Zuora account already has an active recurring contribution subscription")
    } yield ()
  }

  def errorResponse(msg: String) = ReturnWithResponse(ApiGatewayResponse.messageResponse("422", msg))

  def check(condition: Boolean, ifFalseReturn: String): ApiGatewayOp[Unit] = if (condition) ContinueProcessing(()) else errorResponse(ifFalseReturn)

  def extract[V](option: Option[V], ifNoneReturn: String): ApiGatewayOp[V] = option.map(someValue => ContinueProcessing(someValue)).getOrElse(errorResponse(ifNoneReturn))

}

