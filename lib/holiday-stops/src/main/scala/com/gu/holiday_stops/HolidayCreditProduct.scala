package com.gu.holiday_stops

/**
 * Same Discount holiday stop product is reused for all products, namely:
 *   'DO NOT USE MANUALLY: Holiday Credit - automated'
 *
 *   https://www.zuora.com/apps/Product.do?method=view&id=2c92a0ff5345f9200153559c6d2a3385#ST_DO%20NOT%20USE%20MANUALLY:%20Holiday%20Credit%20-%20automated
 */
case class HolidayCreditProduct(
  productRatePlanId: String,
  productRatePlanChargeId: String
) extends CreditProduct

object HolidayCreditProduct {
  val Prod = HolidayCreditProduct(
    productRatePlanId = "2c92a0076ae9189c016b080c930a6186",
    productRatePlanChargeId = "2c92a0086ae928d7016b080f638477a6"
  )

  val Code = HolidayCreditProduct(
    productRatePlanId = "2c92c0f86b0378b0016b08112e870d0a",
    productRatePlanChargeId = "2c92c0f86b0378b0016b08112ec70d14"
  )

  val Dev = HolidayCreditProduct(
    productRatePlanId = "2c92c0f96b03800b016b081fc04f1ba2",
    productRatePlanChargeId = "2c92c0f96b03800b016b081fc0f41bb4"
  )
}
