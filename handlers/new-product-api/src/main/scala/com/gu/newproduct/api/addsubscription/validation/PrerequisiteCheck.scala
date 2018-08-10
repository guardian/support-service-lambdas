package com.gu.newproduct.api.addsubscription.validation

import java.time.LocalDate

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.AddSubscriptionRequest
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.ZuoraIds.ProductRatePlanId
import com.gu.newproduct.api.addsubscription.validation.ValidateRequest.ValidatableFields
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.WireModel.ZuoraSubscriptionsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{PaymentMethod, PaymentMethodWire}
import com.gu.newproduct.api.addsubscription.zuora.{GetAccount, GetAccountSubscriptions, GetPaymentMethod}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestRequestMaker

case class ValidatedFields(paymentMethod: PaymentMethod, currency: Currency)
object PrerequisiteCheck {
  def apply(
    zuoraClient: RestRequestMaker.Requests,
    contributionRatePlanIds: List[ProductRatePlanId],
    isValidStartDate: LocalDate => ValidationResult[Unit]
  )(request: AddSubscriptionRequest): ApiGatewayOp[ValidatedFields] = {

    def getAccount = GetAccount(zuoraClient.get[ZuoraAccount]) _

    def getPaymentMethod = GetPaymentMethod(zuoraClient.get[PaymentMethodWire]) _

    def getSubscriptions = GetAccountSubscriptions(zuoraClient.get[ZuoraSubscriptionsResponse]) _

    for {
      _ <- ValidatePlan(request.planId).toApiGatewayOp

      account <- getAccount(request.zuoraAccountId).toApiResponseCheckingNotFound(
        action = "load account from Zuora",
        ifNotFoundReturn = "Zuora account id is not valid"
      )
      paymentMethodId <- ValidateAccount(account).toApiGatewayOp
      paymentMethod <- getPaymentMethod(paymentMethodId).toApiGatewayOp("load payment method from Zuora")
      _ <- ValidatePaymentMethod(paymentMethod).toApiGatewayOp
      subs <- getSubscriptions(request.zuoraAccountId).toApiGatewayOp("get subscriptions for account from Zuora")
      _ <- ValidateSubscriptions(contributionRatePlanIds)(subs).toApiGatewayOp
      validatableFields = ValidatableFields(request.amountMinorUnits, request.startDate)
      _ <- ValidateRequest(isValidStartDate, AmountLimits.limitsFor)(validatableFields, account.currency).toApiGatewayOp
    } yield ValidatedFields(paymentMethod, account.currency)
  }

}

