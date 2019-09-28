package com.gu.holiday_stops.config

case class SundayPlusVoucherHolidayStopConfig(
  productRatePlanId: String
)

object SundayPlusVoucherHolidayStopConfig {
  val Prod = SundayPlusVoucherHolidayStopConfig(
    productRatePlanId = "2c92a0fe56fe33ff0157040d4b824168"
  )
  val Code = SundayPlusVoucherHolidayStopConfig(
    productRatePlanId = "2c92c0f858aa38af0158b9dae19110a3"
  )
  val Dev = SundayPlusVoucherHolidayStopConfig(
    productRatePlanId = "2c92c0f955a0b5bf0155b62623846fc8"
  )
}

