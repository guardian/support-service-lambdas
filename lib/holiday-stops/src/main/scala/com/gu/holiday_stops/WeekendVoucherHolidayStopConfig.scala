package com.gu.holiday_stops

case class WeekendVoucherHolidayStopConfig(
  holidayCreditProduct: HolidayCreditProduct,
  productRatePlanId: String
)

object WeekendVoucherHolidayStopConfig {
  val Prod = WeekendVoucherHolidayStopConfig(
    holidayCreditProduct = HolidayCreditProduct.Prod,
    productRatePlanId = "2c92a0ff56fe33f00157040f9a537f4b"
  )
  val Code = WeekendVoucherHolidayStopConfig(
    holidayCreditProduct = HolidayCreditProduct.Code,
    productRatePlanId = "2c92c0f855c9f4b20155d9f1db9b5199"
  )
  val Dev = WeekendVoucherHolidayStopConfig(
    holidayCreditProduct = HolidayCreditProduct.Dev,
    productRatePlanId = "2c92c0f8555ce5cf01556e7f01b81b94"
  )
}
