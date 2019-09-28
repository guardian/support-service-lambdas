package com.gu.holiday_stops.config

case class EverydayVoucherHolidayStopConfig(
  productRatePlanId: String
)

object EverydayVoucherHolidayStopConfig {
  val Prod = EverydayVoucherHolidayStopConfig(
    productRatePlanId = "2c92a0fd56fe270b0157040e42e536ef"
  )
  val Code = EverydayVoucherHolidayStopConfig(
    productRatePlanId = "2c92c0f855c9f4b20155d9f1d3d4512a"
  )
  val Dev = EverydayVoucherHolidayStopConfig(
    productRatePlanId = "2c92c0f9555cf10501556e84a70440e2"
  )
}
