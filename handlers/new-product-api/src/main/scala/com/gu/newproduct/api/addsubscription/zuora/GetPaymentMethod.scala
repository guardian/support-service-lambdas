package com.gu.newproduct.api.addsubscription.zuora

import com.gu.newproduct.api.addsubscription.zuora.GetAccount.PaymentMethodId
import com.gu.util.resthttp.RestRequestMaker.{RequestsGet, WithoutCheck}
import com.gu.util.resthttp.Types._
import play.api.libs.json._

object GetPaymentMethod {

  sealed trait PaymentMethodStatus

  object ActivePaymentMethod extends PaymentMethodStatus

  object NotActivePaymentMethod extends PaymentMethodStatus

  sealed trait PaymentMethodType

  object PayPal extends PaymentMethodType

  object CreditCard extends PaymentMethodType

  object BankTransfer extends PaymentMethodType

  object CreditCardReferenceTransaction extends PaymentMethodType

  object Other extends PaymentMethodType

  case class PaymentMethodWire(PaymentMethodStatus: String, Type: String) {

    val stringToType = Map(
      "PayPal" -> PayPal,
      "CreditCard" -> CreditCard,
      "CreditCardReferenceTransaction" -> CreditCardReferenceTransaction,
      "BankTransfer" -> BankTransfer
    )

    def toPaymentMethod: PaymentMethod =
      PaymentMethod(
        status = if (PaymentMethodStatus == "Active") ActivePaymentMethod else NotActivePaymentMethod,
        paymentMethodType = stringToType.getOrElse(Type, Other)
      )
  }

  implicit val wireReads = Json.reads[PaymentMethodWire]

  case class PaymentMethod(status: PaymentMethodStatus, paymentMethodType: PaymentMethodType)

  def apply(get: RequestsGet[PaymentMethodWire])(paymentMethodId: PaymentMethodId): ClientFailableOp[PaymentMethod] =
    get(s"object/payment-method/${paymentMethodId.value}", WithoutCheck).map(_.toPaymentMethod)
}
