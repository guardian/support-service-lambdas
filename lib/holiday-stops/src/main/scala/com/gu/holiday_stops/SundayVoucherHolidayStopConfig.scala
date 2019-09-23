package com.gu.holiday_stops

// DO NOT USE MANUALLY: Holiday Credit - automated
case class SundayVoucherHolidayStopConfig(
  holidayCreditProduct: HolidayCreditProduct,
  productRatePlanChargeId: String
)

object SundayVoucherHolidayStopConfig {
  val Prod = SundayVoucherHolidayStopConfig(
    holidayCreditProduct = HolidayCreditProduct(
      productRatePlanId = "2c92a0076ae9189c016b080c930a6186",
      productRatePlanChargeId = "2c92a0086ae928d7016b080f638477a6"
    ),
    productRatePlanChargeId = "2c92a0fe5af9a6b9015b0fe1ed121177"
  )
  val Code = SundayVoucherHolidayStopConfig(
    holidayCreditProduct = HolidayCreditProduct(
      productRatePlanId = "2c92c0f86b0378b0016b08112e870d0a",
      productRatePlanChargeId = "2c92c0f86b0378b0016b08112ec70d14"
    ),
    productRatePlanChargeId = "2c92c0f95aff3b54015b0ee0eb620b30"
  )
  val Dev = SundayVoucherHolidayStopConfig(
    holidayCreditProduct = HolidayCreditProduct(
      productRatePlanId = "2c92c0f96b03800b016b081fc04f1ba2",
      productRatePlanChargeId = "2c92c0f96b03800b016b081fc0f41bb4"
    ),
    productRatePlanChargeId = "2c92c0f95aff3b56015b1045fba832d4"
  )
}
