package com.gu.holiday_stops.config

case class SixdayVoucherHolidayStopConfig(
  productRatePlanId: String
)

object SixdayVoucherHolidayStopConfig {
  val Prod = SixdayVoucherHolidayStopConfig(
    productRatePlanId = "2c92a0fd56fe270b0157040e42e536ef"
  )
  val Code = SixdayVoucherHolidayStopConfig(
    productRatePlanId = "2c92c0f955ca02910155da254a641fb3"
  )
  val Dev = SixdayVoucherHolidayStopConfig(
    productRatePlanId = "2c92c0f8555ce5cf01556e7f01771b8a"
  )
}
