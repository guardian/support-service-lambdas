package com.gu.deliveryproblemcreditprocessor

import com.gu.creditprocessor.Processor.CreditProductForSubscription
import com.gu.util.config.Stage
import com.gu.zuora.subscription.{CreditProduct, RatePlan}

object DeliveryCreditProduct {

  val ratePlanChargeName = "Delivery-problem credit"

  private[deliveryproblemcreditprocessor] case class DeliveryCreditProductForStage(
      GuardianWeekly: CreditProduct,
      HomeDelivery: CreditProduct,
      HomeDeliveryObserverOnly: CreditProduct,
      NationalDelivery: CreditProduct,
  )

  private[deliveryproblemcreditprocessor] val Prod: DeliveryCreditProductForStage = DeliveryCreditProductForStage(
    GuardianWeekly = CreditProduct(
      productRatePlanId = "2c92a00d6f9de7f6016f9f6f52765aa4",
      productRatePlanChargeId = "2c92a00d6f9de7f6016f9f6f529e5aaf",
    ),
    HomeDelivery = CreditProduct(
      productRatePlanId = "2c92a0fe7375d60901737c64808e4be1",
      productRatePlanChargeId = "2c92a0fe7375d60901737c6480bc4be3",
    ),
    HomeDeliveryObserverOnly = CreditProduct(
      productRatePlanId = "8a12904195dbb37b019610e4faa408b7",
      productRatePlanChargeId = "8a12904195dbb37b019610e4faf908bc",
    ),
    NationalDelivery = CreditProduct(
      productRatePlanId = "8a1299c28aff1e73018b004582a22581",
      productRatePlanChargeId = "8a1299c28aff1e73018b004583002583",
    ),
  )

  private[deliveryproblemcreditprocessor] val Code: DeliveryCreditProductForStage = DeliveryCreditProductForStage(
    GuardianWeekly = CreditProduct(
      productRatePlanId = "2c92c0f86f7e6f04016f9e4fbf551c5c",
      productRatePlanChargeId = "2c92c0f86f7e6f04016f9e4fbf821c5e",
    ),
    HomeDelivery = CreditProduct(
      productRatePlanId = "2c92c0f9736c46000173715ed9b964ae",
      productRatePlanChargeId = "2c92c0f9736c46000173715eda4e64b0",
    ),
    HomeDeliveryObserverOnly = CreditProduct(
      productRatePlanId = "71a10368c8a961a192c63e2f10790115",
      productRatePlanChargeId = "71a10368c8a961a192c63e2f10d80116",
    ),
    NationalDelivery = CreditProduct(
      productRatePlanId = "8ad08ad58aff62ad018aff6fbea80016",
      productRatePlanChargeId = "8ad08ad58aff62ad018aff6fc5fd005e",
    ),
  )

  private val stages: Map[Stage, DeliveryCreditProductForStage] = Map(
    Stage.Code -> Code,
    Stage.Prod -> Prod,
  )

  def forStage(stage: Stage): CreditProductForSubscription = {

    val creditProductForStage = stages.getOrElse(stage, throw new RuntimeException(s"stage $stage does not exist"))

    def creditProduct: PartialFunction[RatePlan, CreditProduct] = { plan =>
      plan.productName match {
        case s"Guardian Weekly$_" => creditProductForStage.GuardianWeekly
        case s"Tier Three" => creditProductForStage.GuardianWeekly
        case "Newspaper Delivery" =>
          if (plan.ratePlanName == "Sunday")
            creditProductForStage.HomeDeliveryObserverOnly
          else
            creditProductForStage.HomeDelivery
        case "Newspaper - National Delivery" => creditProductForStage.NationalDelivery
      }
    }

    subscription =>
      subscription.ratePlans
        .flatMap(creditProduct.lift)
        .headOption
        .getOrElse(
          throw new IllegalArgumentException(
            s"No delivery credit product available for subscription ${subscription.subscriptionNumber}",
          ),
        )
  }
}
