package com.gu.productmove.zuora.model

import zio.json.JsonDecoder

case class AccountNumber(value: String)

object AccountNumber {
  given JsonDecoder[AccountNumber] = JsonDecoder.string.map(AccountNumber(_))
}
