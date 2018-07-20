package com.gu.newproduct.api.addsubscription.validation

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.{AddSubscriptionRequest, ZuoraAccountId}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.PaymentMethodId
import com.gu.util.reader.Types._

object PrerequisiteCheck {
  def apply(
    validateAccount: ZuoraAccountId => ApiGatewayOp[ValidatedAccount],
    validatePaymentMethod: PaymentMethodId => ApiGatewayOp[Unit],
    validateSubscriptions: ZuoraAccountId => ApiGatewayOp[Unit],
    validateRequest: (AddSubscriptionRequest, Currency) => ApiGatewayOp[Unit]
  )(request: AddSubscriptionRequest): ApiGatewayOp[Unit] =
    for {
      validatedAccount <- validateAccount(request.zuoraAccountId)
      _ <- validatePaymentMethod(validatedAccount.paymentMethodId)
      _ <- validateSubscriptions(request.zuoraAccountId)
      _ <- validateRequest(request, validatedAccount.currency)
    } yield ()
}

