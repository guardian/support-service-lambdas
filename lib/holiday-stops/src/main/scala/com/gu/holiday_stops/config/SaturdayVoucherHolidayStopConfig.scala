package com.gu.holiday_stops.config

case class SaturdayVoucherHolidayStopConfig(
  productRatePlanId: String
)

object SaturdayVoucherHolidayStopConfig {
  val Prod = SaturdayVoucherHolidayStopConfig(
    productRatePlanId = "2c92a0fd6205707201621f9f6d7e0116"
  )
  val Code = SaturdayVoucherHolidayStopConfig(
    productRatePlanId = "2c92c0f961f9cf300161fc02a7d805c9"
  )
  val Dev = SaturdayVoucherHolidayStopConfig(
    productRatePlanId = "2c92c0f861f9c26d0161fc434bfe004c"
  )
}

