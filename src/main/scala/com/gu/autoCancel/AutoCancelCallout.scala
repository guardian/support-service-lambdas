package com.gu.autoCancel

import play.api.libs.json.Json

case class AutoCancelCallout(
    accountId: String,
    autoPay: String,
    email: String,
    firstName: String,
    lastName: String,
    paymentMethodType: String,
    creditCardType: String,
    creditCardExpirationMonth: String,
    creditCardExpirationYear: String,
    invoiceId: String,
    currency: String
) {
  def isAutoPay = autoPay == "true"
  def nonDirectDebit = paymentMethodType != "BankTransfer"
}

object AutoCancelCallout {
  implicit val jf = Json.reads[AutoCancelCallout]
}
