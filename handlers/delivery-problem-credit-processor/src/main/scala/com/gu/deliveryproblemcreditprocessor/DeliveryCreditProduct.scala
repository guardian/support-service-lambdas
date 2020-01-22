package com.gu.deliveryproblemcreditprocessor

import com.gu.util.config.Stage
import com.gu.zuora.subscription.CreditProduct

object DeliveryCreditProduct {

  val Prod = CreditProduct(
    productRatePlanId = "TODO",
    productRatePlanChargeId = "TODO"
  )

  val Code = CreditProduct(
    productRatePlanId = "TODO",
    productRatePlanChargeId = "TODO"
  )

  val Dev = CreditProduct(
    productRatePlanId = "TODO",
    productRatePlanChargeId = "TODO"
  )

  def forStage(stage: Stage): CreditProduct = stage match {
    case Stage("PROD") => DeliveryCreditProduct.Prod
    case Stage("CODE") => DeliveryCreditProduct.Code
    case _ => DeliveryCreditProduct.Dev
  }
}
