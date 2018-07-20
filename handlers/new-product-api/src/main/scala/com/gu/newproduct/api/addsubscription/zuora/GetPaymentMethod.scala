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

  case object PayPal extends PaymentMethodType

  case object CreditCard extends PaymentMethodType

  case object BankTransfer extends PaymentMethodType

  case object CreditCardReferenceTransaction extends PaymentMethodType

  case object Other extends PaymentMethodType

  object PaymentMethod {
    val all = List(PayPal, CreditCard, CreditCardReferenceTransaction, BankTransfer, Other)
  }
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
