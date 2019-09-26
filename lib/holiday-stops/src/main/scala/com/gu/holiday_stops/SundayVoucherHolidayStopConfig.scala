package com.gu.holiday_stops

case class SundayVoucherHolidayStopConfig(
  holidayCreditProduct: HolidayCreditProduct,
  productRatePlanChargeId: String
)

object SundayVoucherHolidayStopConfig {
  val Prod = SundayVoucherHolidayStopConfig(
    HolidayCreditProduct.Prod,
    productRatePlanChargeId = "2c92a0fe5af9a6b9015b0fe1ed121177"
  )
  val Code = SundayVoucherHolidayStopConfig(
    HolidayCreditProduct.Code,
    productRatePlanChargeId = "2c92c0f95aff3b54015b0ee0eb620b30"
  )
  val Dev = SundayVoucherHolidayStopConfig(
    HolidayCreditProduct.Dev,
    productRatePlanChargeId = "2c92c0f95aff3b56015b1045fba832d4"
  )
}
