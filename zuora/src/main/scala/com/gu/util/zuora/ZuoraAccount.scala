package com.gu.util.zuora

import play.api.libs.json._

object ZuoraAccount {

  case class SecondTokenId(value: String) extends AnyVal
  case class PaymentMethodId(value: String) extends AnyVal
  case class AccountId(value: String) extends AnyVal
  case class NumConsecutiveFailures(value: Int) extends AnyVal
  case class CreditCardExpirationMonth(value: Int) extends AnyVal
  case class CreditCardExpirationYear(value: Int) extends AnyVal
  case class CreditCardMaskNumber(value: String) extends AnyVal
  implicit val fPaymentMethodId: Format[PaymentMethodId] =
    Format[PaymentMethodId](JsPath.read[String].map(PaymentMethodId.apply), Writes { (o: PaymentMethodId) => JsString(o.value) })

  implicit val fAccountId: Format[AccountId] =
    Format[AccountId](JsPath.read[String].map(AccountId.apply), Writes { (o: AccountId) => JsString(o.value) })

  implicit val fNumConsecutiveFailures: Format[NumConsecutiveFailures] =
    Format[NumConsecutiveFailures](JsPath.read[Int].map(NumConsecutiveFailures.apply), Writes { (o: NumConsecutiveFailures) => JsNumber(o.value) })

}
