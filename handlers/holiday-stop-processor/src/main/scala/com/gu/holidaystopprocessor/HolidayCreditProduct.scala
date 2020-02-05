package com.gu.holidaystopprocessor

import com.gu.util.config.Stage
import com.gu.zuora.subscription.CreditProduct

/**
 * Same Discount holiday stop product is reused for all products, namely:
 *   'DO NOT USE MANUALLY: Holiday Credit - automated'
 *
 *   https://www.zuora.com/apps/Product.do?method=view&id=2c92a0ff5345f9200153559c6d2a3385#ST_DO%20NOT%20USE%20MANUALLY:%20Holiday%20Credit%20-%20automated
 */
object HolidayCreditProduct {

  val productRatePlanChargeName = "Holiday Credit"

  val Prod = CreditProduct(
    productRatePlanId = "2c92a0076ae9189c016b080c930a6186",
    productRatePlanChargeId = "2c92a0086ae928d7016b080f638477a6",
    productRatePlanChargeName
  )

  val Code = CreditProduct(
    productRatePlanId = "2c92c0f86b0378b0016b08112e870d0a",
    productRatePlanChargeId = "2c92c0f86b0378b0016b08112ec70d14",
    productRatePlanChargeName
  )

  val Dev = CreditProduct(
    productRatePlanId = "2c92c0f96b03800b016b081fc04f1ba2",
    productRatePlanChargeId = "2c92c0f96b03800b016b081fc0f41bb4",
    productRatePlanChargeName
  )

  def forStage(stage: Stage): CreditProduct = stage match {
    case Stage("PROD") => HolidayCreditProduct.Prod
    case Stage("CODE") => HolidayCreditProduct.Code
    case Stage("DEV") => HolidayCreditProduct.Dev
  }
}
