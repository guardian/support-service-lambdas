package com.gu.holiday_stops.config

case class EverydayPlusVoucherHolidayStopConfig(
  productRatePlanId: String
)

object EverydayPlusVoucherHolidayStopConfig {
  val Prod = EverydayPlusVoucherHolidayStopConfig(
    productRatePlanId = "2c92a0ff56fe33f50157040bbdcf3ae4"
  )
  val Code = EverydayPlusVoucherHolidayStopConfig(
    productRatePlanId = "2c92c0f955ca02920155da240cdb4399"
  )
  val Dev = EverydayPlusVoucherHolidayStopConfig(
    productRatePlanId = "2c92c0f95aff3b53015b10469bbf5f5f"
  )
}

