package com.gu.zuora.subscription

import ai.x.play.json.Jsonx
import play.api.libs.json.Format

case class Price(value: Double) extends AnyVal

object Price {
  implicit val formatHolidayStopRequestsDetailChargePrice: Format[Price] =
    Jsonx.formatInline[Price]
}
