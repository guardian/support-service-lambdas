package com.gu.autoCancel

import play.api.libs.json.Json

case class AutoCancelCallout(
    accountId: String,
    autoPay: String,
    paymentMethodType: String
) {
  def isAutoPay = autoPay == "true"
  def nonDirectDebit = paymentMethodType != "BankTransfer"
}

object AutoCancelCallout {
  implicit val jf = Json.reads[AutoCancelCallout]
}
