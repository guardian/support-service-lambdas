package com.gu.zuora.subscription

import play.api.libs.json.{Format, Json}

case class SubscriptionName(value: String) extends AnyVal

object SubscriptionName {
  implicit val formatSubscriptionName: Format[SubscriptionName] =
    Json.valueFormat[SubscriptionName]
}
