package com.gu.paymentFailure

import play.api.libs.json._

case class PaymentFailureCallout(
  PaymentMethodPaymentMethodType: String,
  AccountId: String,
  EventCategory: String,
  PaymentMethodCreditCardType: String,
  AccountCurrency: String,
  EventTimestamp: String,
  PaymentMethodExpirationDate: String,
  PaymentErrorMessage: String
)

object PaymentFailureCallout {
  implicit val jf = Json.reads[PaymentFailureCallout]
}