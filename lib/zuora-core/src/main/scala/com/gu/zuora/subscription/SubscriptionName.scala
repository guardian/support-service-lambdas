package com.gu.zuora.subscription

import ai.x.play.json.Jsonx
import play.api.libs.json.Format

case class SubscriptionName(value: String) extends AnyVal

object SubscriptionName {
  implicit val formatSubscriptionName: Format[SubscriptionName] =
    Jsonx.formatInline[SubscriptionName]
}
