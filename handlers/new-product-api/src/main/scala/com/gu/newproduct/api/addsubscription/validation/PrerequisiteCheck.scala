package com.gu.newproduct.api.addsubscription.validation

import java.time.LocalDateTime

import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.ZuoraIds.ProductRatePlanId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.{Account, PaymentMethodId}
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.Subscription
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.WireModel.ZuoraSubscriptionsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{PaymentMethod, PaymentMethodWire}
import com.gu.newproduct.api.addsubscription.zuora.{GetAccount, GetAccountSubscriptions, GetPaymentMethod}
import com.gu.newproduct.api.addsubscription.{AddSubscriptionRequest, ZuoraAccountId}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestRequestMaker
import com.gu.util.resthttp.Types.ClientFailableOp

object PrerequisiteCheck {
  def apply(
    zuoraClient: RestRequestMaker.Requests,
    contributionRatePlanIds: List[ProductRatePlanId],
    now: () => LocalDateTime
  )(request: AddSubscriptionRequest): ApiGatewayOp[Unit] = {

    def getAccount = GetAccount(zuoraClient.get[ZuoraAccount]) _
    def getPaymentMethod = GetPaymentMethod(zuoraClient.get[PaymentMethodWire]) _
    def getSubscriptions = GetAccountSubscriptions(zuoraClient.get[ZuoraSubscriptionsResponse]) _

    val currentDate = () => now().toLocalDate
    val accountNotFoundError = "Zuora account id is not valid"

    for {
      account <- getAccount(request.zuoraAccountId).toApiResponseCheckingNotFound(action = "load account from Zuora", ifNotFoundReturn = accountNotFoundError)
      validatedAccount <- ValidateAccount(account).toApiGatewayOp
      paymentMethod <- getPaymentMethod(validatedAccount.paymentMethodId).toApiGatewayOp("load payment method from Zuora")
      _ <- ValidatePaymentMethod(paymentMethod).toApiGatewayOp
      subs <- getSubscriptions(request.zuoraAccountId).toApiGatewayOp("get subscriptions for account from Zuora")
      _ <- ValidateSubscriptions(contributionRatePlanIds)(subs).toApiGatewayOp
      _ <- ValidateRequest(currentDate, AmountLimits.limitsFor)(request, validatedAccount.currency).toApiGatewayOp
    } yield ()
  }
}
