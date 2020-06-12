package com.gu.digital_voucher_api

import io.circe.{Encoder, Json}

case class RatePlanName(value: String) extends AnyVal

case class SubscriptionVouchers(cardCode: String, letterCode: String)

case class ReplacementSubscriptionVouchers(cardCode: Option[String], letterCode: Option[String])

object ReplacementSubscriptionVouchers {
  implicit val encodeReplacementSubscriptionVouchers: Encoder[ReplacementSubscriptionVouchers] =
    (replacementVoucher: ReplacementSubscriptionVouchers) => {
      val tupledCardAndLetter = (
        replacementVoucher.cardCode.map(card => ("cardCode", Json.fromString(card))),
        replacementVoucher.letterCode.map(letter => ("letterCode", Json.fromString(letter)))
      )

      tupledCardAndLetter match {
        case (Some(card), Some(letter)) => Json.obj(card, letter)
        case (Some(card), _) => Json.obj(card)
        case (_, Some(letter)) => Json.obj(letter)
        case _ => Json.obj()
      }
    }
}
