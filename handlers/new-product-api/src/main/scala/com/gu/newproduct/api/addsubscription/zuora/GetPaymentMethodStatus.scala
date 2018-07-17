package com.gu.newproduct.api.addsubscription.zuora

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, GenericError}
import play.api.libs.json._
import scalaz.{-\/, \/-}

object GetPaymentMethodStatus {

  sealed trait PaymentMethodStatus
  object Active extends PaymentMethodStatus
  object Closed extends PaymentMethodStatus

  object PaymentMethodStatus

  case class PaymentMethodWire(PaymentMethodStatus: String) {
    def toPayMentMethodStatus: ClientFailableOp[PaymentMethodStatus] = PaymentMethodStatus match {
      case "Active" => \/-(Active)
      case "Closed" => \/-(Closed)
      case unknown => -\/(GenericError(s"Unknown payment method status: '$unknown'"))
    }
  }
  implicit val wireReads = Json.reads[PaymentMethodWire]

  //todo use john's case class for the payment method id
  def apply(get: (String, Boolean) => ClientFailableOp[PaymentMethodWire])(paymentMethodId: String): ClientFailableOp[PaymentMethodStatus] =
    get(s"object/payment-method/$paymentMethodId", true).flatMap(_.toPayMentMethodStatus)
}
