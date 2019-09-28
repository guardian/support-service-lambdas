package com.gu.holiday_stops

case class SundayVoucherHolidayStopConfig(
  productRatePlanId: String
)

object SundayVoucherHolidayStopConfig {
  val Prod = SundayVoucherHolidayStopConfig(
    productRatePlanId = "2c92a0fe5af9a6b9015b0fe1ecc0116c"
  )
  val Code = SundayVoucherHolidayStopConfig(
    productRatePlanId = "2c92c0f95aff3b54015b0ee0eb500b2e"
  )
  val Dev = SundayVoucherHolidayStopConfig(
    productRatePlanId = "2c92c0f95aff3b56015b1045fb9332d2"
  )
}
