package com.gu.paymentFailure

import play.api.libs.json._

case class PaymentFailureCallout(
  accountId: String,
  email: String,
  failureNumber: String,
  firstName: String,
  lastName: String,
  paymentMethodType: String,
  creditCardType: String,
  creditCardExpirationMonth: String,
  creditCardExpirationYear: String,
  paymentId: String,
  currency: String,
  tenantId: String
)

object PaymentFailureCallout {
  implicit val jf = Json.reads[PaymentFailureCallout]
}