package com.gu.newproduct.api.addsubscription.zuora

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, RequestGet}
import play.api.libs.json.{JsError, JsSuccess, Json, Reads}

object GetPaymentMethodDetails {

  sealed trait PaymentMethodStatus
  object Active extends PaymentMethodStatus
  object Closed extends PaymentMethodStatus
  case class PaymentMethodDetails(status: PaymentMethodStatus)


  object PaymentMethodDetails {
    case class PaymentMethodWire(PaymentMethodStatus: String)
    val wireReads = Json.reads[PaymentMethodWire]
    implicit val reads : Reads[PaymentMethodDetails] = x => wireReads.reads(x) flatMap {
      case PaymentMethodWire("Active") => JsSuccess(PaymentMethodDetails(Active))
      case PaymentMethodWire("Closed") => JsSuccess(PaymentMethodDetails(Closed))
      case PaymentMethodWire(unknown) => JsError(s"unknown payment method status: '$unknown'")
    }
  }

  //todo use john's case class for the payment method id
  def apply(getter: RequestGet)(paymentMethodId: String): ClientFailableOp[PaymentMethodDetails] =
    getter.get[PaymentMethodDetails](s"object/payment-method/$paymentMethodId", skipCheck = true)

}
