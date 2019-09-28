package com.gu.holiday_stops.config

case class SaturdayPlusVoucherHolidayStopConfig(
  productRatePlanId: String
)

object SaturdayPlusVoucherHolidayStopConfig {
  val Prod = SaturdayPlusVoucherHolidayStopConfig(
    productRatePlanId = "2c92a0fd6205707201621fa1350710e3"
  )
  val Code = SaturdayPlusVoucherHolidayStopConfig(
    productRatePlanId = "2c92c0f961f9cf350161fc0454283f3e"
  )
  val Dev = SaturdayPlusVoucherHolidayStopConfig(
    productRatePlanId = "2c92c0f961f9cf300161fc44f2661258"
  )
}

