package com.gu.newproduct.api.addsubscription.zuora

import com.gu.newproduct.api.addsubscription.zuora.GetAccount.PaymentMethodId
import com.gu.util.resthttp.RestRequestMaker.{RequestsGet, WithoutCheck}
import com.gu.util.resthttp.Types._
import play.api.libs.json._

object GetPaymentMethodStatus {

  sealed trait PaymentMethodStatus
  object Active extends PaymentMethodStatus
  object Closed extends PaymentMethodStatus

  object PaymentMethodStatus

  case class PaymentMethodWire(PaymentMethodStatus: String) {
    def toPayMentMethodStatus: ClientFailableOp[PaymentMethodStatus] = PaymentMethodStatus match {
      case "Active" => ClientSuccess(Active)
      case "Closed" => ClientSuccess(Closed)
      case unknown => GenericError(s"Unknown payment method status: '$unknown'")
    }
  }
  implicit val wireReads = Json.reads[PaymentMethodWire]

  //todo use john's case class for the payment method id
  def apply(get: RequestsGet[PaymentMethodWire])(paymentMethodId: PaymentMethodId): ClientFailableOp[PaymentMethodStatus] =
    get(s"object/payment-method/${paymentMethodId.value}", WithoutCheck).flatMap(_.toPayMentMethodStatus)
}
