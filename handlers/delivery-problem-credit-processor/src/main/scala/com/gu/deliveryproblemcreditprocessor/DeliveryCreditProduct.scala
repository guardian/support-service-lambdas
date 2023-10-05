package com.gu.deliveryproblemcreditprocessor

import com.gu.creditprocessor.Processor.CreditProductForSubscription
import com.gu.util.config.Stage
import com.gu.zuora.subscription.{CreditProduct, RatePlan}

object DeliveryCreditProduct {

  val ratePlanChargeName = "Delivery-problem credit"

  object Prod {

    val GuardianWeekly: CreditProduct = CreditProduct(
      productRatePlanId = "2c92a00d6f9de7f6016f9f6f52765aa4",
      productRatePlanChargeId = "2c92a00d6f9de7f6016f9f6f529e5aaf",
      productRatePlanChargeName = ratePlanChargeName,
    )

    val HomeDelivery: CreditProduct = CreditProduct(
      productRatePlanId = "2c92a0fe7375d60901737c64808e4be1",
      productRatePlanChargeId = "2c92a0fe7375d60901737c6480bc4be3",
      productRatePlanChargeName = ratePlanChargeName,
    )

    val NationalDelivery: CreditProduct = CreditProduct(
      productRatePlanId = "8a1299c28aff1e73018b004582a22581",
      productRatePlanChargeId = "8a1299c28aff1e73018b004583002583",
      productRatePlanChargeName = ratePlanChargeName,
    )
  }

  object Code {

    val GuardianWeekly: CreditProduct = CreditProduct(
      productRatePlanId = "2c92c0f86f7e6f04016f9e4fbf551c5c",
      productRatePlanChargeId = "2c92c0f86f7e6f04016f9e4fbf821c5e",
      productRatePlanChargeName = ratePlanChargeName,
    )

    val HomeDelivery: CreditProduct = CreditProduct(
      productRatePlanId = "2c92c0f9736c46000173715ed9b964ae",
      productRatePlanChargeId = "2c92c0f9736c46000173715eda4e64b0",
      productRatePlanChargeName = ratePlanChargeName,
    )

    val NationalDelivery: CreditProduct = CreditProduct(
      productRatePlanId = "8ad08ad58aff62ad018aff6fbea80016",
      productRatePlanChargeId = "8ad08ad58aff62ad018aff6fc5fd005e",
      productRatePlanChargeName = ratePlanChargeName,
    )
  }

  def forStage(stage: Stage): CreditProductForSubscription = {

    def creditProduct(stage: Stage)(plan: RatePlan): Option[CreditProduct] = (stage, plan.productName) match {
      case (Stage.Prod, s"Guardian Weekly$_") => Some(DeliveryCreditProduct.Prod.GuardianWeekly)
      case (Stage.Prod, "Newspaper Delivery") => Some(DeliveryCreditProduct.Prod.HomeDelivery)
      case (Stage.Prod, "Newspaper - National Delivery") => Some(DeliveryCreditProduct.Prod.NationalDelivery)
      case (Stage.Code, s"Guardian Weekly$_") => Some(DeliveryCreditProduct.Code.GuardianWeekly)
      case (Stage.Code, "Newspaper Delivery") => Some(DeliveryCreditProduct.Code.HomeDelivery)
      case (Stage.Code, "Newspaper - National Delivery") => Some(DeliveryCreditProduct.Code.NationalDelivery)
      case _ => None
    }

    subscription =>
      subscription.ratePlans
        .flatMap(creditProduct(stage))
        .headOption
        .getOrElse(
          throw new IllegalArgumentException(
            s"No delivery credit product available for subscription ${subscription.subscriptionNumber}",
          ),
        )
  }
}
