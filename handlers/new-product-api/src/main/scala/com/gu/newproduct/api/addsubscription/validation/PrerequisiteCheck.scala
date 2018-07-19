package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.PaymentMethodId
import com.gu.util.reader.Types._

object PrerequisiteCheck {
  def apply(
    validateAccount: ZuoraAccountId => ApiGatewayOp[PaymentMethodId],
    validatePaymentMethod: PaymentMethodId => ApiGatewayOp[Unit],
    validateSubscriptions: ZuoraAccountId => ApiGatewayOp[Unit]
  )(accountId: ZuoraAccountId): ApiGatewayOp[Unit] =
    for {
      paymentMethodId <- validateAccount(accountId)
      _ <- validatePaymentMethod(paymentMethodId)
      _ <- validateSubscriptions(accountId)
    } yield ()

}

