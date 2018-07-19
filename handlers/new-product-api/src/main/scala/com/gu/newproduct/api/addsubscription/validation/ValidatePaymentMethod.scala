package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.PaymentMethodId
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethodStatus.{Active, PaymentMethodStatus}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientFailableOp
import Validation.BooleanValidation
object ValidatePaymentMethod {
  def apply(
    getPaymentMethodStatus: PaymentMethodId => ClientFailableOp[PaymentMethodStatus]
  )(
    paymentMethodId: PaymentMethodId
  ): ApiGatewayOp[Unit] = {
    for {
      paymentMethodStatus <- getPaymentMethodStatus(paymentMethodId).toApiGatewayOp("load payment method status from Zuora")
      _ <- (paymentMethodStatus == Active) ifFalseReturn "Default payment method status in Zuora account is not active"
    } yield ()
  }

}

