package com.gu.holiday_stops.config

case class SixdayPlusVoucherHolidayStopConfig(
  productRatePlanId: String
)

object SixdayPlusVoucherHolidayStopConfig {
  val Prod = SixdayPlusVoucherHolidayStopConfig(
    productRatePlanId = "2c92a0fc56fe26ba0157040c5ea17f6a"
  )
  val Code = SixdayPlusVoucherHolidayStopConfig(
    productRatePlanId = "2c92c0f855c9f4540155da2607db6402"
  )
  val Dev = SixdayPlusVoucherHolidayStopConfig(
    productRatePlanId = "2c92c0f855c3b8190155c585a95e6f5a"
  )
}

