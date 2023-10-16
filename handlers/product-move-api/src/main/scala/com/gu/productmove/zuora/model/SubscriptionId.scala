package com.gu.productmove.zuora.model

import zio.json.{JsonDecoder, JsonEncoder}

case class SubscriptionId(value: String)

object SubscriptionId {
  given JsonDecoder[SubscriptionId] = JsonDecoder.string.map(SubscriptionId(_))
  given JsonEncoder[SubscriptionId] = JsonEncoder.string.contramap(_.value)
}
