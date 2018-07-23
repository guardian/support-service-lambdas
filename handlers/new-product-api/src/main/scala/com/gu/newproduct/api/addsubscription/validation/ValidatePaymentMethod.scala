package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.validation.Validation.BooleanValidation
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.PaymentMethodId
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.PaymentMethod
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.ActivePaymentMethod
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType.{BankTransfer, CreditCard, CreditCardReferenceTransaction, PayPal}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientFailableOp

object ValidatePaymentMethod {
  def apply(
    getPaymentMethod: PaymentMethodId => ClientFailableOp[PaymentMethod]
  )(
    paymentMethodId: PaymentMethodId
  ): ApiGatewayOp[Unit] = {
    for {
      paymentMethod <- getPaymentMethod(paymentMethodId).toApiGatewayOp("load payment method from Zuora")
      _ <- (paymentMethod.status == ActivePaymentMethod) ifFalseReturn "Default payment method status in Zuora account is not active"
      _ <- allowedPaymentMethods.contains(paymentMethod.paymentMethodType) ifFalseReturn paymentTypeError
    } yield ()
  }

  val allowedPaymentMethods = List(PayPal, CreditCard, CreditCardReferenceTransaction, BankTransfer)
  def paymentTypeError = s"Invalid payment method type in Zuora account, must be one of ${allowedPaymentMethods.mkString(",")}"
}

