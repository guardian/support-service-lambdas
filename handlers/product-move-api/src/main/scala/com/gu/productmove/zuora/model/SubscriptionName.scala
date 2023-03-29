package com.gu.productmove.zuora.model

import zio.json.{JsonDecoder, JsonEncoder}

case class SubscriptionName(value: String)

object SubscriptionName {
  given JsonDecoder[SubscriptionName] = JsonDecoder.string.map(SubscriptionName(_))
  given JsonEncoder[SubscriptionName] = JsonEncoder.string.contramap(_.value)
}
