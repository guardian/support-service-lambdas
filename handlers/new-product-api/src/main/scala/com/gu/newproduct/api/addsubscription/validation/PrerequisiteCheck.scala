package com.gu.newproduct.api.addsubscription.validation

import java.time.LocalDateTime

import com.gu.newproduct.api.addsubscription.AddSubscriptionRequest
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.ZuoraIds.ProductRatePlanId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.WireModel.ZuoraSubscriptionsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{PaymentMethod, PaymentMethodWire}
import com.gu.newproduct.api.addsubscription.zuora.{GetAccount, GetAccountSubscriptions, GetPaymentMethod}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestRequestMaker

import scala.concurrent.ExecutionContext

object PrerequisiteCheck {
  def apply(
    zuoraClient: RestRequestMaker.Requests,
    contributionRatePlanIds: List[ProductRatePlanId],
    now: () => LocalDateTime,
    ec: ExecutionContext
  )(request: AddSubscriptionRequest): AsyncApiGatewayOp[PaymentMethod] = {

    implicit val context = ec
    def getAccount = GetAccount(zuoraClient.get[ZuoraAccount]) _

    def getPaymentMethod = GetPaymentMethod(zuoraClient.get[PaymentMethodWire]) _

    def getSubscriptions = GetAccountSubscriptions(zuoraClient.get[ZuoraSubscriptionsResponse]) _

    val currentDate = () => now().toLocalDate
    val accountNotFoundError = "Zuora account id is not valid"

    for {
      account <- getAccount(request.zuoraAccountId).toAsyncApiResponseCheckingNotFound(
        action = "load account from Zuora",
        ifNotFoundReturn = accountNotFoundError
      )
      paymentMethodId <- ValidateAccount(account).toAsyncApiGatewayOp
      paymentMethod <- getPaymentMethod(paymentMethodId).toAsyncApiGatewayOp("load payment method from Zuora")
      _ <- ValidatePaymentMethod(paymentMethod).toAsyncApiGatewayOp
      subs <- getSubscriptions(request.zuoraAccountId).toAsyncApiGatewayOp("get subscriptions for account from Zuora")
      _ <- ValidateSubscriptions(contributionRatePlanIds)(subs).toAsyncApiGatewayOp
      _ <- ValidateRequest(currentDate, AmountLimits.limitsFor)(request, account.currency).toAsyncApiGatewayOp
    } yield (paymentMethod)
  }
}
