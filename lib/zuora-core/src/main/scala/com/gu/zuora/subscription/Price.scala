package com.gu.zuora.subscription

import play.api.libs.json.{Format, Json}

case class Price(value: Double) extends AnyVal

object Price {
  implicit val formatHolidayStopRequestsDetailChargePrice: Format[Price] =
    Json.valueFormat[Price]
}
