package com.gu.holiday_stops.config

case class WeekendPlusVoucherHolidayStopConfig(
  productRatePlanId: String
)

object WeekendPlusVoucherHolidayStopConfig {
  val Prod = WeekendPlusVoucherHolidayStopConfig(
    productRatePlanId = "2c92a0fd56fe26b60157040cdd323f76"
  )
  val Code = WeekendPlusVoucherHolidayStopConfig(
    productRatePlanId = "2c92c0f855c9f4b20155d9f1dd0651ab"
  )
  val Dev = WeekendPlusVoucherHolidayStopConfig(
    productRatePlanId = "2c92c0f95aff3b54015b1047efaa2ac3"
  )
}

