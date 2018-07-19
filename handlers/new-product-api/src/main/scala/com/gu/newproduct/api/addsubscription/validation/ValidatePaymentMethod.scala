package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.PaymentMethodId
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{ActivePaymentMethod, PaymentMethod, PaymentMethodStatus}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientFailableOp
import Validation.BooleanValidation
object ValidatePaymentMethod {
  def apply(
    getPaymentMethod: PaymentMethodId => ClientFailableOp[PaymentMethod]
  )(
    paymentMethodId: PaymentMethodId
  ): ApiGatewayOp[Unit] = {
    for {
      paymentMethod <- getPaymentMethod(paymentMethodId).toApiGatewayOp("load payment method from Zuora")
      _ <- (paymentMethod.status == ActivePaymentMethod) ifFalseReturn "Default payment method status in Zuora account is not active"
    } yield ()
  }

}

