package com.gu.newproduct.api.addsubscription.validation

import java.time.LocalDate

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.AddSubscriptionRequest
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.ZuoraIds.ProductRatePlanId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.WireModel.ZuoraSubscriptionsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{PaymentMethod, PaymentMethodWire}
import com.gu.newproduct.api.addsubscription.zuora.{GetAccount, GetAccountSubscriptions, GetPaymentMethod}
import com.gu.util.reader.AsyncTypes._
import com.gu.util.resthttp.RestRequestMaker

case class ValidatedFields(paymentMethod: PaymentMethod, currency: Currency)
object PrerequisiteCheck {
  def apply(
    zuoraClient: RestRequestMaker.Requests,
    contributionRatePlanIds: List[ProductRatePlanId],
    getCurrentDate: () => LocalDate
  )(request: AddSubscriptionRequest): AsyncApiGatewayOp[ValidatedFields] = {

    def getAccount = GetAccount(zuoraClient.get[ZuoraAccount]) _

    def getPaymentMethod = GetPaymentMethod(zuoraClient.get[PaymentMethodWire]) _

    def getSubscriptions = GetAccountSubscriptions(zuoraClient.get[ZuoraSubscriptionsResponse]) _

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
      _ <- ValidateRequest(getCurrentDate, AmountLimits.limitsFor)(request, account.currency).toAsyncApiGatewayOp
    } yield ValidatedFields(paymentMethod, account.currency)
  }
}
