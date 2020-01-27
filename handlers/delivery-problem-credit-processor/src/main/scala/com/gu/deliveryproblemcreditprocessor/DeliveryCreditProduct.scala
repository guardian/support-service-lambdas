package com.gu.deliveryproblemcreditprocessor

import com.gu.util.config.Stage
import com.gu.zuora.subscription.CreditProduct

object DeliveryCreditProduct {

  val ratePlanChargeName = "Delivery-problem credit"

  val Prod = CreditProduct(
    productRatePlanId = "2c92a00d6f9de7f6016f9f6f52765aa4",
    productRatePlanChargeId = "2c92a00d6f9de7f6016f9f6f529e5aaf",
    productRatePlanChargeName = ratePlanChargeName
  )

  val Code = CreditProduct(
    productRatePlanId = "2c92c0f96f7e7c64016f9f6b71a154aa",
    productRatePlanChargeId = "2c92c0f96f7e7c64016f9f6b71c654ad",
    productRatePlanChargeName = ratePlanChargeName
  )

  val Dev = CreditProduct(
    productRatePlanId = "2c92c0f86f7e6f04016f9e4fbf551c5c",
    productRatePlanChargeId = "2c92c0f86f7e6f04016f9e4fbf821c5e",
    productRatePlanChargeName = ratePlanChargeName
  )

  def forStage(stage: Stage): CreditProduct = stage match {
    case Stage("PROD") => DeliveryCreditProduct.Prod
    case Stage("CODE") => DeliveryCreditProduct.Code
    case _ => DeliveryCreditProduct.Dev
  }
}
