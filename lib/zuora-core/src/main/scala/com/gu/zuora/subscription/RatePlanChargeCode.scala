package com.gu.zuora.subscription

import play.api.libs.json.{Format, Json}

case class RatePlanChargeCode(value: String) extends AnyVal

object RatePlanChargeCode {
  implicit val formatSubscriptionCreditRatePlanChargeCode: Format[RatePlanChargeCode] =
    Json.valueFormat[RatePlanChargeCode]
}
