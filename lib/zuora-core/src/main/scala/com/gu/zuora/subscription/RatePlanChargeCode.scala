package com.gu.zuora.subscription

import ai.x.play.json.Jsonx
import play.api.libs.json.Format

case class RatePlanChargeCode(value: String) extends AnyVal

object RatePlanChargeCode {
  implicit val formatSubscriptionCreditRatePlanChargeCode: Format[RatePlanChargeCode] =
    Jsonx.formatInline[RatePlanChargeCode]
}
