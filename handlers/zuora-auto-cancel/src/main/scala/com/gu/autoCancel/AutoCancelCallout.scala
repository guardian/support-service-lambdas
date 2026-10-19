package com.gu.autoCancel

import play.api.libs.json.{JsResult, JsValue, Json, Reads}

case class AutoCancelCallout(
    accountId: String,
    autoPay: String,
    email: Option[String],
    firstName: String,
    lastName: String,
    paymentMethodType: String,
    creditCardType: String,
    creditCardExpirationMonth: String,
    creditCardExpirationYear: String,
    invoiceId: String,
    currency: String,
    sfContactId: String,
) {
  def isAutoPay = autoPay == "true"
  def nonDirectDebit = paymentMethodType != "BankTransfer"
}

object AutoCancelCallout {

  implicit val NoneForEmptyStringEMailReads: Reads[AutoCancelCallout] = new Reads[AutoCancelCallout] {

    val standardReads = Json.reads[AutoCancelCallout]

    override def reads(json: JsValue): JsResult[AutoCancelCallout] = standardReads.reads(json).map { parsedCallout =>
      parsedCallout.email match {
        case Some("") => parsedCallout.copy(email = None)
        case _ => parsedCallout
      }
    }
  }
}
