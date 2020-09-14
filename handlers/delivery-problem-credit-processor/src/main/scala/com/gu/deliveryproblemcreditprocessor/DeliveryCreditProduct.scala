package com.gu.deliveryproblemcreditprocessor

import com.gu.creditprocessor.Processor.CreditProductForSubscription
import com.gu.util.config.Stage
import com.gu.zuora.subscription.{CreditProduct, RatePlan}

object DeliveryCreditProduct {

  val ratePlanChargeName = "Delivery-problem credit"

  val Prod: CreditProduct = CreditProduct(
    productRatePlanId = "2c92a00d6f9de7f6016f9f6f52765aa4",
    productRatePlanChargeId = "2c92a00d6f9de7f6016f9f6f529e5aaf",
    productRatePlanChargeName = ratePlanChargeName
  )

  val Code: CreditProduct = CreditProduct(
    productRatePlanId = "2c92c0f96f7e7c64016f9f6b71a154aa",
    productRatePlanChargeId = "2c92c0f96f7e7c64016f9f6b71c654ad",
    productRatePlanChargeName = ratePlanChargeName
  )

  object Dev {

    val GuardianWeekly: CreditProduct = CreditProduct(
      productRatePlanId = "2c92c0f86f7e6f04016f9e4fbf551c5c",
      productRatePlanChargeId = "2c92c0f86f7e6f04016f9e4fbf821c5e",
      productRatePlanChargeName = ratePlanChargeName
    )

    val HomeDelivery: CreditProduct = CreditProduct(
      productRatePlanId = "2c92c0f9736c46000173715ed9b964ae",
      productRatePlanChargeId = "2c92c0f9736c46000173715eda4e64b0",
      productRatePlanChargeName = ratePlanChargeName
    )
  }

  def forStage(stage: Stage): CreditProductForSubscription = {

    def creditProduct(stage: Stage)(plan: RatePlan): Option[CreditProduct] = (stage, plan.productName) match {
      case (Stage.Prod, _) => Some(DeliveryCreditProduct.Prod)
      case (Stage.Code, _) => Some(DeliveryCreditProduct.Code)
      case (_, s"Guardian Weekly$_") => Some(DeliveryCreditProduct.Dev.GuardianWeekly)
      case (_, "Newspaper Delivery") => Some(DeliveryCreditProduct.Dev.HomeDelivery)
      case _ => None
    }

    subscription =>
      subscription
        .ratePlans
        .flatMap(creditProduct(stage))
        .headOption
        .getOrElse(
          throw new IllegalArgumentException(
            s"No delivery credit product available for subscription ${subscription.subscriptionNumber}"
          )
        )
  }
}
